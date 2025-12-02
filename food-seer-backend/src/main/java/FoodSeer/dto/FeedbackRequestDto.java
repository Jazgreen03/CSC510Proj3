package FoodSeer.dto;

public record FeedbackRequestDto(
    String recommendedFoodItem,
    Integer rating,
    String review,
    String recommendationContext
) {
    public FeedbackRequestDto {
        if (rating == null || rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }
        if (recommendedFoodItem == null || recommendedFoodItem.trim().isEmpty()) {
            throw new IllegalArgumentException("Recommended food item cannot be empty");
        }
    }
}