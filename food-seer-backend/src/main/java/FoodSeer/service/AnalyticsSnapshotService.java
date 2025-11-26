package FoodSeer.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

import FoodSeer.entity.Food;
import FoodSeer.entity.Order;
import FoodSeer.entity.User;
import FoodSeer.repositories.OrderRepository;
import FoodSeer.repositories.UserRepository;

@Service
public class AnalyticsSnapshotService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InventoryService inventoryService;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_DATE;

    public Map<String, Object> buildSnapshot(final int days) {
        final Map<String, Object> out = new LinkedHashMap<>();

        final List<Order> orders = orderRepository.findAll();

        final long total = orders.size();
        final long fulfilled = orders.stream().filter(Order::getIsFulfilled).count();
        final long unfulfilled = total - fulfilled;

        final long revenue = orders.stream()
                .filter(Order::getIsFulfilled)
                .flatMap(o -> o.getFoods().stream())
                .mapToLong(Food::getPrice)
                .sum();

        final Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("totalOrders", total);
        overview.put("fulfilledOrders", fulfilled);
        overview.put("unfulfilledOrders", unfulfilled);
        overview.put("totalRevenue", revenue);
        overview.put("avgOrderValue", fulfilled > 0 ? (double) revenue / (double) fulfilled : 0.0);

        out.put("overview", overview);

        // orders per day
        final LocalDate today = LocalDate.now(ZoneId.systemDefault());
        final LocalDate from = today.minusDays(days - 1);
        final Map<String, Long> counts = new LinkedHashMap<>();
        for (int i = 0; i < days; i++) {
            counts.put(DATE_FMT.format(from.plusDays(i)), 0L);
        }
        orders.stream()
                .filter(o -> o.getCreatedAt() != null)
                .filter(o -> {
                    final LocalDate d = o.getCreatedAt().toLocalDate();
                    return (!d.isBefore(from)) && (!d.isAfter(today));
                })
                .forEach(o -> {
                    final String k = DATE_FMT.format(o.getCreatedAt().toLocalDate());
                    counts.computeIfPresent(k, (kk, v) -> v + 1);
                });
        out.put("ordersPerDay", counts);

        // basic anomaly detection on the orders-per-day series (z-score based)
        try {
            final var values = counts.values().stream().mapToDouble(Long::doubleValue).toArray();
            double mean = 0.0;
            for (double v : values) mean += v;
            mean = values.length > 0 ? mean / values.length : 0.0;
            double variance = 0.0;
            for (double v : values) variance += (v - mean) * (v - mean);
            variance = values.length > 0 ? variance / values.length : 0.0;
            final double std = Math.sqrt(variance);
            final var anomalies = new java.util.ArrayList<java.util.Map<String, Object>>();
            int idx = 0;
            for (var e : counts.entrySet()) {
                final double v = values[idx++];
                final double z = std > 0 ? (v - mean) / std : 0.0;
                if (Math.abs(z) >= 2.0) {
                    final var a = new java.util.LinkedHashMap<String, Object>();
                    a.put("date", e.getKey());
                    a.put("count", e.getValue());
                    a.put("zScore", z);
                    a.put("type", z > 0 ? "spike" : "drop");
                    anomalies.add(a);
                }
            }
            out.put("anomalies", anomalies);
        } catch (Exception ex) {
            out.put("anomalies", java.util.List.of());
        }

        // top products
        final Map<String, Long> top = orders.stream()
                .flatMap(o -> o.getFoods().stream())
                .collect(Collectors.groupingBy(Food::getFoodName, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue((a, b) -> b.compareTo(a)))
                .limit(20)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new));
        out.put("topProducts", top);

        // preferences
        final List<User> users = userRepository.findAll();
        final Map<String, Long> costDist = users.stream()
                .map(u -> u.getCostPreference() == null ? "UNSET" : u.getCostPreference())
                .collect(Collectors.groupingBy(s -> s, Collectors.counting()));

    // dietary restrictions: original per-user string distribution
    final Map<String, Long> dietDist = users.stream()
        .map(u -> u.getDietaryRestrictions() == null || u.getDietaryRestrictions().isBlank() ? "UNSET" : u.getDietaryRestrictions())
        .collect(Collectors.groupingBy(s -> s, Collectors.counting()));

    // allergen / restriction token counts: split user strings into tokens and count each token separately
    final Map<String, Long> allergenCounts = users.stream()
        .flatMap(u -> {
            final String d = u.getDietaryRestrictions();
            if (d == null || d.isBlank()) return java.util.stream.Stream.empty();
            // split on common delimiters , ; | / and whitespace
            return java.util.Arrays.stream(d.split("[,;|/]+"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(String::toLowerCase);
        })
        .collect(Collectors.groupingBy(s -> s, Collectors.counting()));

    final Map<String, Map<String, Long>> prefs = new LinkedHashMap<>();
    prefs.put("costPreference", costDist);
    prefs.put("dietaryRestrictions", dietDist); // original user-wise strings
    prefs.put("allergenCounts", allergenCounts); // per-allergen counts
    out.put("preferences", prefs);

        // engagement
        final List<Order> recent = orders.stream()
                .filter(o -> o.getCreatedAt() != null)
                .filter(o -> {
                    final LocalDate d = o.getCreatedAt().toLocalDate();
                    return (!d.isBefore(from)) && (!d.isAfter(today));
                })
                .collect(Collectors.toList());

        final long totalRecentOrders = recent.size();
        final Map<String, Long> ordersByUser = recent.stream()
                .filter(o -> o.getUser() != null)
                .collect(Collectors.groupingBy(o -> o.getUser().getUsername(), Collectors.counting()));
        final long activeUsers = ordersByUser.size();
        final double avgOrdersPerActiveUser = activeUsers > 0 ? (double) totalRecentOrders / (double) activeUsers : 0.0;
        final Map<String, Long> topCustomers = ordersByUser.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue((a, b) -> b.compareTo(a)))
                .limit(10)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new));
        final Map<String, Object> engagement = new LinkedHashMap<>();
        engagement.put("totalRecentOrders", totalRecentOrders);
        engagement.put("activeUsers", activeUsers);
        engagement.put("avgOrdersPerActiveUser", avgOrdersPerActiveUser);
        engagement.put("topCustomers", topCustomers);
        out.put("engagement", engagement);

        // inventory: include both a map (name->amount) and the raw inventory list if available
        try {
            final var inv = inventoryService.getInventory();
            if (inv != null && inv.getFoods() != null) {
                final var invMap = inv.getFoods().stream().collect(Collectors.toMap(Food::getFoodName, Food::getAmount, (a,b)->a, LinkedHashMap::new));
                out.put("inventoryMap", invMap);
                out.put("inventoryList", inv.getFoods());
            } else {
                out.put("inventoryMap", Map.of());
                out.put("inventoryList", java.util.List.of());
            }
        } catch (Exception e) {
            out.put("inventoryMap", Map.of());
            out.put("inventoryList", java.util.List.of());
        }

        return out;
    }
}
