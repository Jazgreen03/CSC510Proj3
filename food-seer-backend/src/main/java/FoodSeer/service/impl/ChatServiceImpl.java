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
                // Auto-detect intent from user message
                if (userMsg.contains("recommend") || userMsg.contains("suggest") || userMsg.contains("what should") || 
                    userMsg.contains("what would") || userMsg.contains("hungry") || userMsg.contains("eat") ||
                    userMsg.contains("food") || userMsg.contains("meal")) {
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
                        return new ChatResponseDto(q.toString(), true, null);
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
                
                try {
                    if ("recommend".equalsIgnoreCase(mode) && foods != null && !foods.isEmpty()) {
                        // Apply intelligent filtering based on user message AND conversation history for context
                        final java.util.List<FoodDto> filtered = recommendationService.filterFoodsWithContext(
                            userMsg, 
                            chatRequest.getHistory(), 
                            foods
                        );
                        final FoodDto selected = recommendationService.selectBestRecommendation(filtered);
                        
                        if (selected != null) {
                            matchedId = selected.getId();
                            // Use deterministic explanation instead of AI's potentially hallucinated response
                            finalResponse = recommendationService.generateRecommendationExplanation(selected, userMsg);
                            System.out.println("DEBUG: Intelligent recommendation selected: " + selected.getFoodName() + " (ID: " + matchedId + ")");
                            System.out.println("DEBUG: Response: " + finalResponse);
                        } else {
                            System.out.println("DEBUG: No suitable recommendation found after filtering");
                            finalResponse = "I apologize, but I don't have any items in our menu that match your request. Could you tell me more about what you're looking for?";
                        }
                    }
                } catch (final Exception e) {
                    System.err.println("DEBUG: Error during intelligent recommendation: " + e.getMessage());
                    e.printStackTrace();
                }

                return new ChatResponseDto(finalResponse, false, matchedId);
            }

            return new ChatResponseDto("No response from AI", false, null);
            
        } catch (final Exception e) {
            System.err.println("Error communicating with Ollama: " + e.getMessage());
            e.printStackTrace();
            return new ChatResponseDto("Error: " + e.getMessage(), false, null);
        }
    }
}

