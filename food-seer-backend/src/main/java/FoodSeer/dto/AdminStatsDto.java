package FoodSeer.dto;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * DTO representing administrative statistics about orders and foods.
 */
public class AdminStatsDto {

    private long totalOrders;
    private long fulfilledOrders;
    private long unfulfilledOrders;
    private long totalRevenue; // in same units as Food.price
    private Map<String, Long> topProducts = new LinkedHashMap<>();

    public long getTotalOrders() {
        return totalOrders;
    }

    public void setTotalOrders(long totalOrders) {
        this.totalOrders = totalOrders;
    }

    public long getFulfilledOrders() {
        return fulfilledOrders;
    }

    public void setFulfilledOrders(long fulfilledOrders) {
        this.fulfilledOrders = fulfilledOrders;
    }

    public long getUnfulfilledOrders() {
        return unfulfilledOrders;
    }

    public void setUnfulfilledOrders(long unfulfilledOrders) {
        this.unfulfilledOrders = unfulfilledOrders;
    }

    public long getTotalRevenue() {
        return totalRevenue;
    }

    public void setTotalRevenue(long totalRevenue) {
        this.totalRevenue = totalRevenue;
    }

    public Map<String, Long> getTopProducts() {
        return topProducts;
    }

    public void setTopProducts(Map<String, Long> topProducts) {
        this.topProducts = topProducts;
    }

}
