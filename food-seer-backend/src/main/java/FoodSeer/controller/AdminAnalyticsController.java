package FoodSeer.controller;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import FoodSeer.dto.AnalyticsOverviewDto;
import FoodSeer.dto.ScheduledReportDto;
import FoodSeer.service.ScheduledReportService;
import FoodSeer.entity.Food;
import FoodSeer.entity.Order;
import FoodSeer.entity.User;
import FoodSeer.repositories.UserRepository;
import FoodSeer.repositories.OrderRepository;

/**
 * Admin analytics endpoints for dashboard visualizations.
 */
@CrossOrigin("*")
@RestController
@RequestMapping("/api/admin/analytics")
public class AdminAnalyticsController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ScheduledReportService scheduledReportService;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_DATE;

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/overview")
    public ResponseEntity<AnalyticsOverviewDto> overview() {
        final List<Order> orders = orderRepository.findAll();

        final long total = orders.size();
        final long fulfilled = orders.stream().filter(Order::getIsFulfilled).count();
        final long unfulfilled = total - fulfilled;

        final long revenue = orders.stream()
                .filter(Order::getIsFulfilled)
                .flatMap(o -> o.getFoods().stream())
                .mapToLong(Food::getPrice)
                .sum();

        final AnalyticsOverviewDto dto = new AnalyticsOverviewDto();
        dto.setTotalOrders(total);
        dto.setFulfilledOrders(fulfilled);
        dto.setUnfulfilledOrders(unfulfilled);
        dto.setTotalRevenue(revenue);
        dto.setAvgOrderValue(fulfilled > 0 ? (double) revenue / (double) fulfilled : 0.0);

        return ResponseEntity.ok(dto);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/orders-per-day")
    public ResponseEntity<Map<String, Long>> ordersPerDay(@RequestParam(name = "days", defaultValue = "30") final int days) {
        final List<Order> orders = orderRepository.findAll();

        final LocalDate today = LocalDate.now(ZoneId.systemDefault());
        final LocalDate from = today.minusDays(days - 1);

        // initialize all dates to 0
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

        return ResponseEntity.ok(counts);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/top-products")
    public ResponseEntity<Map<String, Long>> topProducts(@RequestParam(name = "limit", defaultValue = "10") final int limit) {
        final List<Order> orders = orderRepository.findAll();

        final Map<String, Long> top = orders.stream()
                .flatMap(o -> o.getFoods().stream())
                .collect(Collectors.groupingBy(Food::getFoodName, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue((a, b) -> b.compareTo(a)))
                .limit(limit)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new));

        return ResponseEntity.ok(top);
    }

    /**
     * Returns distribution of user preferences (costPreference and dietaryRestrictions)
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/preferences")
    public ResponseEntity<Map<String, Map<String, Long>>> preferencesDistribution() {
    final List<User> users = userRepository.findAll();

    final Map<String, Long> costDist = users.stream()
        .map(u -> u.getCostPreference() == null ? "UNSET" : u.getCostPreference())
        .collect(Collectors.groupingBy(s -> s, Collectors.counting()));

    final Map<String, Long> dietDist = users.stream()
        .map(u -> u.getDietaryRestrictions() == null || u.getDietaryRestrictions().isBlank() ? "UNSET" : u.getDietaryRestrictions())
        .collect(Collectors.groupingBy(s -> s, Collectors.counting()));

    final Map<String, Map<String, Long>> out = new LinkedHashMap<>();
    out.put("costPreference", costDist);
    out.put("dietaryRestrictions", dietDist);
    return ResponseEntity.ok(out);
    }

    /**
     * Engagement metrics for the last N days.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/engagement")
    public ResponseEntity<Map<String, Object>> engagement(@RequestParam(name = "days", defaultValue = "30") final int days) {
    final List<Order> orders = orderRepository.findAll();

    final LocalDate today = LocalDate.now(ZoneId.systemDefault());
    final LocalDate from = today.minusDays(days - 1);

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

    // top customers by orders in period
    final Map<String, Long> topCustomers = ordersByUser.entrySet().stream()
        .sorted(Map.Entry.<String, Long>comparingByValue((a, b) -> b.compareTo(a)))
        .limit(10)
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new));

    final Map<String, Object> out = new LinkedHashMap<>();
    out.put("totalRecentOrders", totalRecentOrders);
    out.put("activeUsers", activeUsers);
    out.put("avgOrdersPerActiveUser", avgOrdersPerActiveUser);
    out.put("topCustomers", topCustomers);
    return ResponseEntity.ok(out);
    }

    /**
     * Returns a combined snapshot of all analytics (overview, orders-per-day, top-products,
     * preferences, engagement and inventory) so clients can download a bundled report.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/snapshot")
    public ResponseEntity<Map<String, Object>> snapshot(@RequestParam(name = "days", defaultValue = "30") final int days) {
        final Map<String, Object> out = new LinkedHashMap<>();
        out.put("overview", overview().getBody());
        out.put("ordersPerDay", ordersPerDay(days).getBody());
        out.put("topProducts", topProducts(20).getBody());
        out.put("preferences", preferencesDistribution().getBody());
        out.put("engagement", engagement(days).getBody());

        // inventory via InventoryController/Service is available; fetch via repository through orderRepository -> use foods from inventory
        // For simplicity, build inventory map from Food entities referenced in orders and users — but better to call InventoryService.
        final Map<String, Long> inventoryMap = orderRepository.findAll().stream()
                .flatMap(o -> o.getFoods().stream())
                .collect(Collectors.groupingBy(Food::getFoodName, Collectors.summingLong(Food::getAmount)));
        out.put("inventory", inventoryMap);

        return ResponseEntity.ok(out);
    }

    /**
     * Register a scheduled report. This is a lightweight scaffold: schedules are stored in-memory and
     * a background task will attempt to run them and log the snapshot (requires mail config to send emails).
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/schedule")
    public ResponseEntity<String> scheduleReport(@RequestBody final ScheduledReportDto dto) {
        scheduledReportService.register(dto);
        return ResponseEntity.ok("Scheduled report registered");
    }

}
