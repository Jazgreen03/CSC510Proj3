package FoodSeer.entity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "recommendation_feedback")

public class RecommendationFeedback {

    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false)
    private String recommendedFoodItem;
    
    @Column(nullable = false)
    private Integer rating;
    
    @Column(length = 1000)
    private String review;
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    @Column
    private String imageUrl;
    
    private String aiModel;
    
    private String recommendationContext;
    
    // Constructor
    public RecommendationFeedback() {
        this.createdAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public String getRecommendedFoodItem() {
        return recommendedFoodItem;
    }
    
    public void setRecommendedFoodItem(String recommendedFoodItem) {
        this.recommendedFoodItem = recommendedFoodItem;
    }
    
    public Integer getRating() {
        return rating;
    }
    
    public void setRating(Integer rating) {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }
        this.rating = rating;
    }
    
    public String getReview() {
        return review;
    }
    
    public void setReview(String review) {
        this.review = review;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public String getAiModel() {
        return aiModel;
    }
    
    public void setAiModel(String aiModel) {
        this.aiModel = aiModel;
    }
    
    public String getRecommendationContext() {
        return recommendationContext;
    }

    public String getImageUrl() {
    return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
    
    public void setRecommendationContext(String recommendationContext) {
        this.recommendationContext = recommendationContext;
    }
}