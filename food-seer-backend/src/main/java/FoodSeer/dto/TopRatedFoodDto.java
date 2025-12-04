package FoodSeer.dto;

import java.time.LocalDateTime;

public class TopRatedFoodDto {
    private Long id;
    private String recommendedFoodItem;
    private Integer rating;
    private String review;
    private String imageUrl;
    private LocalDateTime createdAt;

    public TopRatedFoodDto(Long id, String recommendedFoodItem, Integer rating,
                           String review, String imageUrl, LocalDateTime createdAt) {
        this.id = id;
        this.recommendedFoodItem = recommendedFoodItem;
        this.rating = rating;
        this.review = review;
        this.imageUrl = imageUrl;
        this.createdAt = createdAt;
    }

    // Getters
    public Long getId() { return id; }
    public String getRecommendedFoodItem() { return recommendedFoodItem; }
    public Integer getRating() { return rating; }
    public String getReview() { return review; }
    public String getImageUrl() { return imageUrl; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
