package FoodSeer.service;

import java.util.List;

import FoodSeer.dto.FoodDto;
import FoodSeer.dto.MessageDto;

/**
 * Service for intelligent food recommendations and filtering
 */
public interface RecommendationService {

    /**
     * Filter foods based on user message constraints
     * Detects dietary restrictions, cuisine preferences, temperature, etc.
     *
     * @param userMessage The user's message containing dietary preferences
     * @param availableFoods The list of all available foods
     * @return Filtered list of foods that match the constraints
     */
    List<FoodDto> filterFoodsBasedOnMessage(String userMessage, List<FoodDto> availableFoods);

    /**
     * Filter foods based on user message AND conversation history context
     * Maintains persistent preferences from earlier in the conversation
     *
     * @param userMessage The user's current message
     * @param conversationHistory The full conversation history (can be null)
     * @param availableFoods The list of all available foods
     * @return Filtered list of foods that match the combined constraints
     */
    List<FoodDto> filterFoodsWithContext(String userMessage, List<MessageDto> conversationHistory, List<FoodDto> availableFoods);

    /**
     * Pick the best food recommendation from a list
     *
     * @param filteredFoods Foods that match the user's constraints
     * @return The recommended food, or null if no suitable options
     */
    FoodDto selectBestRecommendation(List<FoodDto> filteredFoods);

    /**
     * Generate an AI-friendly prompt explaining why a specific food was chosen
     *
     * @param food The selected food
     * @param userMessage The user's original message
     * @return An explanation string for the AI to incorporate
     */
    String generateRecommendationExplanation(FoodDto food, String userMessage);
}
