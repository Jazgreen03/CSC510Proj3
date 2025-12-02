package FoodSeer.service;

import FoodSeer.dto.FeedbackRequestDto;
import FoodSeer.dto.FeedbackResponseDto;
import FoodSeer.entity.RecommendationFeedback;
import FoodSeer.entity.User;
import FoodSeer.repositories.RecommendationFeedbackRepository;
import FoodSeer.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
