package FoodSeer.controller;

import java.util.Comparator;
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
import org.springframework.web.bind.annotation.RestController;

import FoodSeer.dto.AdminStatsDto;
import FoodSeer.entity.Food;
import FoodSeer.entity.Order;
import FoodSeer.repositories.OrderRepository;

/**
 * Admin endpoints for overall statistics and reporting.
 */
@CrossOrigin("*")
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private OrderRepository orderRepository;

    /**
     * Returns aggregated statistics about orders and products.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDto> getStats() {
        final List<Order> orders = orderRepository.findAll();

        final AdminStatsDto dto = new AdminStatsDto();

        dto.setTotalOrders(orders.size());
        final long fulfilled = orders.stream().filter(Order::getIsFulfilled).count();
        dto.setFulfilledOrders(fulfilled);
        dto.setUnfulfilledOrders(dto.getTotalOrders() - fulfilled);

        // Revenue: sum of food prices in fulfilled orders
        final long revenue = orders.stream()
                .filter(Order::getIsFulfilled)
                .flatMap(o -> o.getFoods().stream())
                .mapToLong(Food::getPrice)
                .sum();
        dto.setTotalRevenue(revenue);

        // Top products across all orders (by count)
        final Map<String, Long> topProducts = orders.stream()
                .flatMap(o -> o.getFoods().stream())
                .collect(Collectors.groupingBy(Food::getFoodName, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
                .limit(5)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new));

        dto.setTopProducts(topProducts);

        return ResponseEntity.ok(dto);
    }

}
