package FoodSeer.dto;

/**
 * High-level analytics overview DTO for admin dashboard.
 */
public class AnalyticsOverviewDto {
    private long totalOrders;
    private long fulfilledOrders;
    private long unfulfilledOrders;
    private long totalRevenue;
    private double avgOrderValue;

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

    public double getAvgOrderValue() {
        return avgOrderValue;
    }

    public void setAvgOrderValue(double avgOrderValue) {
        this.avgOrderValue = avgOrderValue;
    }
}
