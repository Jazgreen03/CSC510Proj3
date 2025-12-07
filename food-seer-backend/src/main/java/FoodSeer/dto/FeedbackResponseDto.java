package FoodSeer.dto;

import java.time.LocalDateTime;

public record FeedbackResponseDto(
    Long id,
    String username,
    String recommendedFoodItem,
    Integer rating,
    String review,
    LocalDateTime createdAt,
    String aiModel,
    String recommendationContext
) {}