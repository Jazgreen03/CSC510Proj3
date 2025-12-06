package FoodSeer.controller;

import FoodSeer.dto.FeedbackRequestDto;
import FoodSeer.dto.FeedbackResponseDto;
import FoodSeer.service.FeedbackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin("*")
@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {
    
    @Autowired
    private FeedbackService feedbackService;
    
    @PostMapping
    public ResponseEntity<?> submitFeedback(
            @RequestBody FeedbackRequestDto request,
            Authentication authentication) {
        
        try {
            String username = authentication.getName();
            FeedbackResponseDto response = feedbackService.submitFeedback(username, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to submit feedback"));
        }
    }
    
    @GetMapping("/my-feedback")
    public ResponseEntity<?> getMyFeedback(Authentication authentication) {
        try {
            String username = authentication.getName();
            List<FeedbackResponseDto> feedback = feedbackService.getUserFeedback(username);
            return ResponseEntity.ok(feedback);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to retrieve feedback"));
        }
    }
    
    @GetMapping("/food/{foodItem}")
    public ResponseEntity<?> getFeedbackForFood(@PathVariable String foodItem) {
        try {
            List<FeedbackResponseDto> feedback = feedbackService.getFeedbackForFood(foodItem);
            return ResponseEntity.ok(feedback);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to retrieve feedback for food item"));
        }
    }
    
    @GetMapping("/food/{foodItem}/average")
    public ResponseEntity<?> getAverageRating(@PathVariable String foodItem) {
        try {
            Double avgRating = feedbackService.getAverageRating(foodItem);
            Map<String, Object> response = new HashMap<>();
            response.put("foodItem", foodItem);
            response.put("averageRating", avgRating);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to calculate average rating"));
        }
    }
    
    @GetMapping("/stats")
    public ResponseEntity<?> getUserStats(Authentication authentication) {
        try {
            String username = authentication.getName();
            Long feedbackCount = feedbackService.getUserFeedbackCount(username);
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalFeedback", feedbackCount);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to retrieve stats"));
        }
    }
}