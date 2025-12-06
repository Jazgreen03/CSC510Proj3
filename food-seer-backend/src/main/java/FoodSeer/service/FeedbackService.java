package FoodSeer.service;

import FoodSeer.dto.FeedbackRequestDto;
import FoodSeer.dto.FeedbackResponseDto;
import FoodSeer.dto.TopRatedFoodDto;
import FoodSeer.entity.RecommendationFeedback;
import FoodSeer.entity.User;
import FoodSeer.repositories.RecommendationFeedbackRepository;
import FoodSeer.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FeedbackService {
    
    @Autowired
    private RecommendationFeedbackRepository feedbackRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    public FeedbackResponseDto submitFeedback(String username, FeedbackRequestDto request) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found: " + username));
        
        RecommendationFeedback feedback = new RecommendationFeedback();
        feedback.setUser(user);
        feedback.setRecommendedFoodItem(request.recommendedFoodItem());
        feedback.setRating(request.rating());
        feedback.setReview(request.review());
        feedback.setRecommendationContext(request.recommendationContext());
        feedback.setImageUrl(request.imageUrl());  // <- set from FeedbackRequestDto
        feedback.setAiModel("ollama");
        
        RecommendationFeedback saved = feedbackRepository.save(feedback);
        
        return mapToDto(saved);
    }
    
    public List<FeedbackResponseDto> getUserFeedback(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found: " + username));
        
        return feedbackRepository.findRecentFeedbackByUser(user)
            .stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    public Double getAverageRating(String foodItem) {
        Double avg = feedbackRepository.getAverageRatingForFood(foodItem);
        return avg != null ? avg : 0.0;
    }
    
    public List<FeedbackResponseDto> getFeedbackForFood(String foodItem) {
        return feedbackRepository.findByRecommendedFoodItem(foodItem)
            .stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    public Long getUserFeedbackCount(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found: " + username));
        return feedbackRepository.countByUser(user);
    }
    
   public List<FeedbackResponseDto> getUserTopRatedUniqueFoods(String username) {
    User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found: " + username));

    return feedbackRepository.findTopRatedByUser(user)
            .stream()
            .collect(Collectors.toMap(
                RecommendationFeedback::getRecommendedFoodItem, // unique food
                f -> f,                                          // keep feedback
                (a, b) -> a,                                     // if duplicate, keep first (highest rating)
                LinkedHashMap::new                               // preserve order
            ))
            .values()
            .stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    public List<TopRatedFoodDto> getTopRatedFoods(String username) {
    User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found: " + username));

    return feedbackRepository.findTopRatedByUser(user)
            .stream()
            .map(f -> new TopRatedFoodDto(
                    f.getId(),
                    f.getRecommendedFoodItem(),
                    f.getRating(),
                    f.getReview(),
                    f.getImageUrl(),    // Make sure entity has this field
                    f.getCreatedAt()
            ))
            .toList();
    }

    private FeedbackResponseDto mapToDto(RecommendationFeedback feedback) {
        return new FeedbackResponseDto(
            feedback.getId(),
            feedback.getUser().getUsername(),
            feedback.getRecommendedFoodItem(),
            feedback.getRating(),
            feedback.getReview(),
            feedback.getCreatedAt(),
            feedback.getAiModel(),
            feedback.getRecommendationContext()
        );
    }
}
