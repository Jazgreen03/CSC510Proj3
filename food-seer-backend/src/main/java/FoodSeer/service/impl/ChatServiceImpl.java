package FoodSeer.service.impl;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Autowired;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import FoodSeer.dto.ChatRequestDto;
import FoodSeer.dto.ChatResponseDto;
import FoodSeer.dto.MessageDto;
import FoodSeer.dto.FoodDto;
import FoodSeer.entity.User;
import FoodSeer.service.ChatService;
import FoodSeer.service.ConversationService;
import FoodSeer.service.FoodService;
import FoodSeer.service.UserService;
import FoodSeer.service.RecommendationService;

/**
 * Implementation of ChatService for communicating with Ollama AI.
 */
@Service
public class ChatServiceImpl implements ChatService {
    
    /** Ollama API endpoint */
    private static final String OLLAMA_URL = "http://localhost:11434/api/generate";
    
    /** Model to use */
    private static final String MODEL = "gemma3:1b";
    
    /** REST template for HTTP requests */
    private final RestTemplate restTemplate;
    
    /** JSON object mapper */
    private final ObjectMapper objectMapper;

    @Autowired
    private FoodService foodService;

    @Autowired
    private UserService userService;

    @Autowired
    private RecommendationService recommendationService;

    @Autowired
    private ConversationService conversationService;
    
    /**
     * Constructor for ChatServiceImpl.
     */
    public ChatServiceImpl() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }
    
    @Override
    public ChatResponseDto sendMessage(final ChatRequestDto chatRequest) {
        try {
            // Determine intent/mode from the actual user message
            String mode = chatRequest.getMode();
            final String userMsg = chatRequest.getMessage() == null ? "" : chatRequest.getMessage().toLowerCase();
            
            if (mode == null || mode.isBlank() || "auto".equalsIgnoreCase(mode)) {
                // Auto-detect intent from user message - be aggressive about detecting food requests
                if (userMsg.contains("recommend") || userMsg.contains("suggest") || userMsg.contains("what should") || 
                    userMsg.contains("what would") || userMsg.contains("hungry") || userMsg.contains("eat") ||
                    userMsg.contains("food") || userMsg.contains("meal") || userMsg.contains("want") ||
                    userMsg.contains("get") || userMsg.contains("order") || userMsg.contains("chinese") ||
                    userMsg.contains("vegetarian") || userMsg.contains("spicy") || userMsg.contains("hot") ||
                    userMsg.contains("cold") || userMsg.contains("what about") || userMsg.contains("how about")) {
                    mode = "recommend";
                } else {
                    mode = "freeform";
                }
            }

            // Build conversational prompt - simpler, more natural
            final StringBuilder promptBuilder = new StringBuilder();
            promptBuilder.append("You are a friendly food recommendation assistant. Keep responses short (2-3 sentences max).\n");
            promptBuilder.append("When the user asks for food recommendations, acknowledge their request warmly and briefly.\n");
            promptBuilder.append("DO NOT list menu items or repeat conversation history.\n");

            // Attach user profile if available
            User user = null;
            try {
                if (chatRequest.getUserId() != null) {
                    user = userService.findById(chatRequest.getUserId());
                } else {
                    user = userService.getCurrentUser();
                }
            } catch (final Exception e) {
                // ignore - user info optional
            }

            // Always load foods for entity extraction and recommendations
            java.util.List<FoodDto> foods = java.util.Collections.emptyList();
            try {
                foods = foodService.getAllFoods();
            } catch (final Exception e) {
                // ignore food list if unavailable
            }

            // Don't include menu in prompt - we use intelligent filtering instead

            // Include minimal context - just the current user message
            promptBuilder.append("\nUser: ").append(chatRequest.getMessage()).append("\n");
            promptBuilder.append("Assistant: ");

            // Create request body for Ollama
            final ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("model", MODEL);
            requestBody.put("prompt", promptBuilder.toString());
            requestBody.put("stream", false);
            
            // Set headers
            final HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            // Make request
            final HttpEntity<String> entity = new HttpEntity<>(
                objectMapper.writeValueAsString(requestBody), 
                headers
            );
            
            final ResponseEntity<String> response = restTemplate.postForEntity(
                OLLAMA_URL, 
                entity, 
                String.class
            );
            
            // Parse response
            if (response.getBody() != null) {
                final JsonNode responseJson = objectMapper.readTree(response.getBody());
                final String aiResponse = responseJson.get("response").asText();

                // Use intelligent filtering to select a food recommendation
                Long matchedId = null;
                String finalResponse = aiResponse;
                
                // Log the detected mode
                System.out.println("DEBUG: Mode detected as: " + mode);
                System.out.println("DEBUG: User message: " + userMsg);
                
                
                // Removed hardcoded logic blocks. Intelligent filtering will handle recommendations below.
                
                try {
                    // ALWAYS try to match a food when the user might be asking for recommendations
                    // Check both the mode AND the user message for recommendation keywords
                    boolean shouldRecommend = "recommend".equalsIgnoreCase(mode) || 
                        userMsg.contains("want") || userMsg.contains("recommend") || 
                        userMsg.contains("suggest") || userMsg.contains("hungry") ||
                        userMsg.contains("meal") || userMsg.contains("food") ||
                        userMsg.contains("spicy") || userMsg.contains("hot") ||
                        userMsg.contains("chinese") || userMsg.contains("vegetarian") ||
                        userMsg.contains("italian") || userMsg.contains("mexican") ||
                        userMsg.contains("asian") || userMsg.contains("american") ||
                        userMsg.contains("dessert") || userMsg.contains("sweet") ||
                        userMsg.contains("else") || userMsg.contains("another") || 
                        userMsg.contains("different") || userMsg.contains("other") ||
                        userMsg.contains("what about") || userMsg.contains("how about");
                    
                    if (shouldRecommend && foods != null && !foods.isEmpty()) {
                        System.out.println("DEBUG: Attempting intelligent filtering (shouldRecommend=" + shouldRecommend + ", mode=" + mode + ")");
                        System.out.println("DEBUG: Available foods: " + foods.size());
                        // Apply intelligent filtering based on user message AND conversation history for context
                        final java.util.List<FoodDto> filtered = recommendationService.filterFoodsWithContext(
                            userMsg, 
                            chatRequest.getHistory(), 
                            foods
                        );
                        System.out.println("DEBUG: Filtered down to " + filtered.size() + " foods");
                        final FoodDto selected = recommendationService.selectBestRecommendation(filtered);
                        
                        if (selected != null) {
                            matchedId = selected.getId();
                            System.out.println("DEBUG: Matched food: " + selected.getFoodName() + " (ID: " + matchedId + ")");
                            
                            // OVERRIDE AI response with actual selected food to prevent hallucination
                            finalResponse = generateDeterministicResponse(selected, userMsg);
                            System.out.println("DEBUG: Generated deterministic response: " + finalResponse);
                        } else {
                            System.out.println("DEBUG: No suitable food found after filtering");
                        }
                    } else {
                        System.out.println("DEBUG: Not attempting recommendation filtering. shouldRecommend=" + shouldRecommend + ", foods=" + (foods != null ? foods.size() : "null"));
                    }
                } catch (final Exception e) {
                    System.err.println("DEBUG: Error during intelligent filtering: " + e.getMessage());
                    e.printStackTrace();
                }

                // Save messages to database for conversation history
                if (user != null) {
                    try {
                        conversationService.saveMessage(user, chatRequest.getMessage(), "user");
                        conversationService.saveMessage(user, finalResponse, "assistant");
                    } catch (final Exception e) {
                        System.err.println("DEBUG: Error saving conversation history: " + e.getMessage());
                    }
                }

                return new ChatResponseDto(finalResponse, null, false, matchedId);
            }

            return new ChatResponseDto("No response from AI", null, false, null);
            
        } catch (final Exception e) {
            System.err.println("Error communicating with Ollama: " + e.getMessage());
            e.printStackTrace();
            return new ChatResponseDto("Error: " + e.getMessage(), null, false, null);
        }
    }
    
    /**
     * Generate a deterministic response that mentions the actual selected food
     * to prevent AI hallucination of food names not in the database.
     */
    private String generateDeterministicResponse(final FoodDto food, final String userMessage) {
        final StringBuilder response = new StringBuilder();
        
        // Start with an appropriate intro based on user message
        if (userMessage.contains("spicy") || userMessage.contains("hot")) {
            response.append("Okay! We have a delicious ");
        } else if (userMessage.contains("want") || userMessage.contains("recommend")) {
            response.append("Great! I recommend our ");
        } else {
            response.append("Perfect! Try our ");
        }
        
        // Add the actual food name and price
        response.append("**").append(food.getFoodName()).append("** ($").append(food.getPrice()).append(")");
        
        // Add contextual description based on tags
        if (food.getTags() != null && !food.getTags().isEmpty()) {
            response.append(". ");
            
            boolean hasSpicy = food.getTags().contains("SPICY");
            boolean hasHot = food.getTags().contains("HOT");
            boolean hasAsian = food.getTags().contains("ASIAN");
            boolean hasHealthy = food.getTags().contains("HEALTHY");
            boolean isVegetarian = food.getTags().contains("VEGETARIAN");
            
            if (hasSpicy && userMessage.contains("spicy")) {
                response.append("It's got a nice spicy kick");
            } else if (hasHot) {
                response.append("It's a warm and hearty option");
            } else {
                response.append("It's a great choice");
            }
            
            if (hasAsian) {
                response.append(" with authentic Asian flavors");
            }
            
            if (isVegetarian && userMessage.contains("vegetarian")) {
                response.append(" and it's completely vegetarian");
            }
            
            if (hasHealthy) {
                response.append(" that's healthy too");
            }
            
            response.append("!");
        }
        
        return response.toString();
    }
}

