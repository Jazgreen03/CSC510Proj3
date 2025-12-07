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
            promptBuilder.append("You are a helpful food recommendation assistant. Be friendly, conversational, and concise.\n");
            promptBuilder.append("IMPORTANT: When recommending food, ONLY suggest items from the menu provided below.\n");
            promptBuilder.append("ONLY recommend foods that match the user's request.\n");
            promptBuilder.append("Do NOT suggest foods that contradict their request (e.g., if they ask for vegetarian, suggest ONLY vegetarian items).\n");
            promptBuilder.append("If no suitable items match their request, be honest and explain what you can offer instead.\n");

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

            // If in recommend mode or conversation suggests it, include available foods in prompt
            if ("recommend".equalsIgnoreCase(mode) || userMsg.contains("menu") || userMsg.contains("food") || userMsg.contains("recommend") || userMsg.contains("suggest")) {
                if (!foods.isEmpty()) {
                    promptBuilder.append("\n=== AVAILABLE MENU ITEMS (recommend from these only) ===\n");
                    promptBuilder.append("Format: [NAME] ($PRICE) - Allergies/Dietary Info\n");
                    int limit = 30; // Show all available
                    for (int i = 0; i < foods.size() && i < limit; i++) {
                        final FoodDto f = foods.get(i);
                        promptBuilder.append("- ").append(f.getFoodName()).append(" ($").append(f.getPrice()).append(")");
                        if (f.getAllergies() != null && !f.getAllergies().isEmpty()) {
                            promptBuilder.append(" - Contains: ").append(String.join(", ", f.getAllergies()));
                        } else {
                            promptBuilder.append(" - No common allergens (VEGETARIAN OPTION)");
                        }
                        promptBuilder.append("\n");
                    }
                    promptBuilder.append("=== END MENU ===\n");
                }

                // Only ask for clarification if truly needed for a recommendation
                if ("recommend".equalsIgnoreCase(mode)) {
                    final boolean missingBudget = user == null || user.getCostPreference() == null || user.getCostPreference().isBlank();
                    final boolean missingAllergies = user == null || user.getDietaryRestrictions() == null || user.getDietaryRestrictions().isBlank();
                    if (missingBudget || missingAllergies) {
                        final StringBuilder q = new StringBuilder();
                        q.append("I'd love to recommend something! Just need a bit of info:");
                        if (missingBudget) q.append(" What's your budget? (budget / moderate / premium)");
                        if (missingAllergies) q.append(" Any dietary restrictions or allergies?");
                        return new ChatResponseDto(q.toString(), null, true, null);
                    }
                }
            }

            // Add user profile context (brief)
            if (user != null) {
                promptBuilder.append("User's budget preference: ").append(user.getCostPreference() == null ? "moderate" : user.getCostPreference()).append("\n");
                if (user.getDietaryRestrictions() != null && !user.getDietaryRestrictions().isBlank()) {
                    promptBuilder.append("User's dietary restrictions: ").append(user.getDietaryRestrictions()).append("\n");
                }
            }

            // Include conversation history for context (last 5-10 messages for relevance)
            if (chatRequest.getHistory() != null && !chatRequest.getHistory().isEmpty()) {
                promptBuilder.append("\nRecent conversation:\n");
                int start = Math.max(0, chatRequest.getHistory().size() - 10);
                for (int i = start; i < chatRequest.getHistory().size(); i++) {
                    final MessageDto msg = chatRequest.getHistory().get(i);
                    promptBuilder.append(msg.getRole()).append(": ").append(msg.getContent()).append("\n");
                }
            }

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

