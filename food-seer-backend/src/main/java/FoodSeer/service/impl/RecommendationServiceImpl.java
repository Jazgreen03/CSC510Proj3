package FoodSeer.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import org.springframework.stereotype.Service;

import FoodSeer.dto.FoodDto;
import FoodSeer.dto.MessageDto;
import FoodSeer.service.RecommendationService;

/**
 * Implementation of intelligent food recommendation and filtering
 */
@Service
public class RecommendationServiceImpl implements RecommendationService {

    private static final Random random = new Random();

    // Dietary constraint keywords
    private static final String[] VEGETARIAN_KEYWORDS = { "vegetarian", "veggie", "no meat" };
    private static final String[] VEGAN_KEYWORDS = { "vegan", "no animal" };
    private static final String[] SPICY_KEYWORDS = { "spicy", "hot", "spice", "chili", "pepper" };
    private static final String[] MILD_KEYWORDS = { "mild", "not spicy", "not hot", "bland", "plain" };
    private static final String[] COLD_KEYWORDS = { "cold", "chilled", "ice", "frozen", "cold drink" };
    private static final String[] HOT_KEYWORDS = { "hot", "warm", "steaming", "heat" };
    private static final String[] ASIAN_KEYWORDS = { "chinese", "japanese", "asian", "sushi", "ramen", "thai", "korean" };
    private static final String[] MEXICAN_KEYWORDS = { "mexican", "burrito", "taco", "salsa" };
    private static final String[] SWEET_KEYWORDS = { "sweet", "dessert", "candy", "cake", "ice cream", "chocolate" };
    private static final String[] HEALTHY_KEYWORDS = { "healthy", "salad", "light", "clean", "nutrition" };
    private static final String[] PREMIUM_KEYWORDS = { "premium", "expensive", "fancy", "special", "best" };

    @Override
    public List<FoodDto> filterFoodsBasedOnMessage(final String userMessage, final List<FoodDto> availableFoods) {
        return filterFoodsWithContext(userMessage, null, availableFoods);
    }

    @Override
    public List<FoodDto> filterFoodsWithContext(final String userMessage, final List<MessageDto> conversationHistory, final List<FoodDto> availableFoods) {
        if (userMessage == null || userMessage.isBlank() || availableFoods == null) {
            return availableFoods;
        }

        final String lower = userMessage.toLowerCase();
        final List<FoodDto> filtered = new ArrayList<>(availableFoods);

        // Build context string from conversation history (last 10 messages)
        final StringBuilder contextBuilder = new StringBuilder();
        if (conversationHistory != null && !conversationHistory.isEmpty()) {
            int start = Math.max(0, conversationHistory.size() - 10);
            for (int i = start; i < conversationHistory.size(); i++) {
                final MessageDto msg = conversationHistory.get(i);
                if (msg != null && msg.getContent() != null && !"system".equalsIgnoreCase(msg.getRole())) {
                    contextBuilder.append(" ").append(msg.getContent());
                }
            }
        }
        final String fullContext = (lower + " " + contextBuilder.toString()).toLowerCase();

        // Filter by dietary constraints (exclude if mentioned in current message or history)
        if (containsAny(fullContext, VEGETARIAN_KEYWORDS)) {
            filterOut(filtered, "MEAT", "BEEF", "PORK", "POULTRY", "FISH", "SHELLFISH");
        }
        if (containsAny(fullContext, VEGAN_KEYWORDS)) {
            filterOut(filtered, "MEAT", "BEEF", "PORK", "POULTRY", "FISH", "SHELLFISH", "MILK", "DAIRY", "EGGS");
        }

        // Filter by temperature preference (check current message first, then history)
        if (containsAny(lower, COLD_KEYWORDS)) {
            filtered.retainAll(filterByTag(filtered, "COLD"));
        } else if (containsAny(lower, HOT_KEYWORDS) || (containsAny(fullContext, HOT_KEYWORDS) && !containsAny(lower, COLD_KEYWORDS))) {
            filtered.retainAll(filterByTag(filtered, "HOT"));
        }

        // Filter by cuisine (check full context to maintain preferences)
        if (containsAny(fullContext, ASIAN_KEYWORDS)) {
            filtered.retainAll(filterByTag(filtered, "ASIAN", "JAPANESE"));
        }
        if (containsAny(fullContext, MEXICAN_KEYWORDS)) {
            filtered.retainAll(filterByTag(filtered, "MEXICAN"));
        }

        // Filter by food type
        if (containsAny(lower, SWEET_KEYWORDS)) {
            filtered.retainAll(filterByTag(filtered, "DESSERT", "SWEET"));
        }
        if (containsAny(lower, HEALTHY_KEYWORDS)) {
            filtered.retainAll(filterByTag(filtered, "HEALTHY", "VEGAN", "VEGETARIAN"));
        }

        // Return filtered list, or original if everything was filtered out (fallback)
        return filtered.isEmpty() ? availableFoods : filtered;
    }

    @Override
    public FoodDto selectBestRecommendation(final List<FoodDto> filteredFoods) {
        if (filteredFoods == null || filteredFoods.isEmpty()) {
            return null;
        }
        // Pick a random food from the filtered list for variety
        return filteredFoods.get(random.nextInt(filteredFoods.size()));
    }

    @Override
    public String generateRecommendationExplanation(final FoodDto food, final String userMessage) {
        if (food == null) {
            return "";
        }

        final String lower = userMessage.toLowerCase();
        final StringBuilder explanation = new StringBuilder();
        
        // Start with the recommendation
        explanation.append("Great choice! I recommend our **").append(food.getFoodName()).append("** ($").append(food.getPrice()).append(")");

        // Add contextual explanation based on tags and user request
        if (food.getTags() != null && !food.getTags().isEmpty()) {
            boolean isVegetarian = food.getTags().contains("VEGETARIAN");
            boolean isVegan = food.getTags().contains("VEGAN");
            boolean isHot = food.getTags().contains("HOT");
            boolean isCold = food.getTags().contains("COLD");
            boolean isHealthy = food.getTags().contains("HEALTHY");
            boolean isAsian = food.getTags().contains("ASIAN");
            boolean isJapanese = food.getTags().contains("JAPANESE");
            boolean isMexican = food.getTags().contains("MEXICAN");
            boolean isDessert = food.getTags().contains("DESSERT");
            
            explanation.append(". ");
            
            if (lower.contains("vegetarian") && isVegetarian) {
                explanation.append("This is a delicious vegetarian option ");
            } else if (lower.contains("vegan") && isVegan) {
                explanation.append("This is a wonderful fully vegan option ");
            } else if (lower.contains("hot") && isHot) {
                explanation.append("This is a warm and comforting option ");
            } else if (lower.contains("cold") && isCold) {
                explanation.append("This is a refreshing cold option ");
            } else if (lower.contains("healthy") && isHealthy) {
                explanation.append("This is a healthy and nutritious choice ");
            } else {
                explanation.append("This is a great selection ");
            }
            
            if (isAsian || isJapanese) {
                explanation.append("with delicious Asian flavors");
            } else if (isMexican) {
                explanation.append("with authentic Mexican flavors");
            } else if (isDessert) {
                explanation.append("perfect for satisfying your sweet tooth");
            } else if (isHealthy) {
                explanation.append("packed with nutrition and flavor");
            } else {
                explanation.append("that will satisfy your craving");
            }
        } else {
            explanation.append(". This will satisfy your craving!");
            return explanation.toString();
        }
        
        explanation.append("!");
        return explanation.toString();
    }

    /**
     * Check if a string contains any of the given keywords
     */
    private boolean containsAny(final String text, final String[] keywords) {
        for (final String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Filter out foods that contain any of the given allergens/attributes
     */
    private void filterOut(final List<FoodDto> foods, final String... allergens) {
        foods.removeIf(food -> {
            if (food.getAllergies() != null) {
                for (final String allergen : allergens) {
                    if (food.getAllergies().contains(allergen)) {
                        return true;
                    }
                }
            }
            return false;
        });
    }

    /**
     * Filter foods by tags
     */
    private List<FoodDto> filterByTag(final List<FoodDto> foods, final String... tags) {
        final List<FoodDto> result = new ArrayList<>();
        for (final FoodDto food : foods) {
            if (food.getTags() != null) {
                for (final String tag : tags) {
                    if (food.getTags().contains(tag)) {
                        result.add(food);
                        break;
                    }
                }
            }
        }
        return result;
    }
}
