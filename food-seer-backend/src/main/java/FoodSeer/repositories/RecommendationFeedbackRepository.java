package FoodSeer.repositories;

import FoodSeer.entity.RecommendationFeedback;
import FoodSeer.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecommendationFeedbackRepository extends JpaRepository<RecommendationFeedback, Long> {
    
    // Find all feedback by a specific user
    List<RecommendationFeedback> findByUser(User user);
    
    // Find all feedback for a specific food item
    List<RecommendationFeedback> findByRecommendedFoodItem(String foodItem);
    
    // Get average rating for a specific food item
    @Query("SELECT AVG(f.rating) FROM RecommendationFeedback f WHERE f.recommendedFoodItem = :foodItem")
    Double getAverageRatingForFood(@Param("foodItem") String foodItem);
    
    // Get recent feedback by user, ordered by creation date
    @Query("SELECT f FROM RecommendationFeedback f WHERE f.user = :user ORDER BY f.createdAt DESC")
    List<RecommendationFeedback> findRecentFeedbackByUser(@Param("user") User user);
    
    // Count total feedback by a user
    @Query("SELECT COUNT(f) FROM RecommendationFeedback f WHERE f.user = :user")
    Long countByUser(@Param("user") User user);
    
    // Find feedback by rating
    List<RecommendationFeedback> findByRating(Integer rating);
    
    // Find highly rated items (4 stars and above)
    @Query("SELECT f FROM RecommendationFeedback f WHERE f.rating >= 4 ORDER BY f.createdAt DESC")
    List<RecommendationFeedback> findHighlyRatedFeedback();
    
    // Get all feedback for a specific AI model
    List<RecommendationFeedback> findByAiModel(String aiModel);
}