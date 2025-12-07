package FoodSeer.service.impl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import FoodSeer.entity.User;
import FoodSeer.entity.Role;
import FoodSeer.entity.Food;
import FoodSeer.repositories.UserRepository;
import FoodSeer.repositories.RoleRepository;
import FoodSeer.repositories.FoodRepository;
import FoodSeer.repositories.OrderRepository;
import FoodSeer.entity.Order;
import java.time.LocalDateTime;
import java.util.Arrays;

/**
 * Initializes application data such as a default admin user.
 */
@Component
public class DataInitializer {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final FoodRepository foodRepository;
    private final OrderRepository orderRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin-user-password:admin}")
    private String adminPassword;

    public DataInitializer(UserRepository userRepository,
                           RoleRepository roleRepository,
                           FoodRepository foodRepository,
                           OrderRepository orderRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.foodRepository = foodRepository;
        this.orderRepository = orderRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Helper method to create a Food with both allergies and tags
     */
    private Food createFood(final String name, final int amount, final int price, 
                           final List<String> allergies, final List<String> tags) {
        final Food food = new Food(name, amount, price, allergies);
        final List<String> upperTags = new ArrayList<>();
        for (final String tag : tags) {
            upperTags.add(tag.toUpperCase());
        }
        food.setTags(upperTags);
        return food;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        // Ensure roles exist
        if (roleRepository.findByName("ROLE_ADMIN") == null) {
            roleRepository.save(new Role(null, "ROLE_ADMIN"));
        }
        if (roleRepository.findByName("ROLE_CUSTOMER") == null) {
            roleRepository.save(new Role(null, "ROLE_CUSTOMER"));
        }
        if (roleRepository.findByName("ROLE_STAFF") == null) {
            roleRepository.save(new Role(null, "ROLE_STAFF"));
        }

        // Ensure admin user exists or update password
        User admin = userRepository.findByUsername("admin").orElse(null);
        if (admin == null) {
            final String hash = passwordEncoder.encode(adminPassword);
            admin = User.builder()
                    .username("admin")
                    .email("admin@localhost")
                    .password(hash)
                    .role("ROLE_ADMIN")
                    .build();
            userRepository.save(admin);
            System.out.println("Created default admin user 'admin' with password: " + adminPassword);
        } else {
            // Update admin password if it has changed
            final String hash = passwordEncoder.encode(adminPassword);
            admin.setPassword(hash);
            userRepository.save(admin);
            System.out.println("Updated admin user password to: " + adminPassword);
        }

        // Initialize sample food data if database is empty OR if foods don't have tags yet OR if count doesn't match expected
        long foodCount = foodRepository.count();
        final int EXPECTED_FOOD_COUNT = 46; // Updated with expanded Chinese menu
        boolean foodsNeedTags = foodCount > 0 && foodRepository.findAll().stream()
            .anyMatch(f -> f.getTags() == null || f.getTags().isEmpty());
        boolean needsUpdate = foodCount != EXPECTED_FOOD_COUNT;
        
        if (foodCount == 0 || foodsNeedTags || needsUpdate) {
            if (foodsNeedTags) {
                System.out.println("Foods exist but lack tags - clearing and reinitializing with tags...");
                try {
                    // Delete orders first to avoid foreign key constraints
                    System.out.println("Deleting all orders to clear foreign key constraints...");
                    orderRepository.deleteAll();
                    System.out.println("Deleting all existing foods...");
                    foodRepository.deleteAll();
                    System.out.println("All data cleared successfully");
                } catch (Exception e) {
                    System.err.println("Error during cleanup: " + e.getMessage());
                    e.printStackTrace();
                }
            } else if (needsUpdate && foodCount < EXPECTED_FOOD_COUNT) {
                System.out.println("Food count mismatch (found " + foodCount + ", expected " + EXPECTED_FOOD_COUNT + ") - clearing and reinitializing...");
                try {
                    orderRepository.deleteAll();
                    foodRepository.deleteAll();
                } catch (Exception e) {
                    System.err.println("Error during cleanup: " + e.getMessage());
                }
            } else if (foodCount == 0) {
                System.out.println("Database empty - initializing sample food data...");
            } else {
                System.out.println("Skipping food initialization");
                return; // Don't reinitialize if count already correct or higher
            }
            
            List<Food> sampleFoods = new ArrayList<>();
            
            /*
             * Comprehensive Allergen List Reference:
             * - MILK/DAIRY: milk, cheese, butter, cream
             * - LACTOSE: lactose intolerance specific
             * - EGGS: egg products
             * - FISH: finned fish
             * - SHELLFISH: crustaceans, mollusks
             * - TREE-NUTS: almonds, walnuts, cashews, etc.
             * - PEANUTS: peanuts specifically
             * - WHEAT: wheat flour
             * - GLUTEN: wheat, barley, rye
             * - SOY: soybean products
             * - SESAME: sesame seeds/oil
             * - CORN: corn products
             * - SULFITES: preservatives in wine, dried fruit
             * - MUSTARD: mustard seeds/products
             * - MEAT: general meat (for vegetarians)
             * - BEEF: beef specifically
             * - PORK: pork specifically
             * - POULTRY: chicken, turkey
             * - GELATIN: animal-derived gelatin
             * - CAFFEINE: caffeinated products
             */
            
            // Budget-friendly options (under $10)
            sampleFoods.add(createFood("COFFEE", 50, 3, Arrays.asList("CAFFEINE"), Arrays.asList("HOT_TEMP", "BEVERAGE", "SAVORY")));
            sampleFoods.add(createFood("TEA", 40, 2, Arrays.asList("CAFFEINE"), Arrays.asList("HOT_TEMP", "BEVERAGE", "SAVORY")));
            sampleFoods.add(createFood("BAGEL", 30, 4, Arrays.asList("GLUTEN", "WHEAT", "SESAME"), Arrays.asList("BREAKFAST", "ROOM_TEMP", "SAVORY")));
            sampleFoods.add(createFood("BANANA", 60, 1, new ArrayList<>(), Arrays.asList("VEGETARIAN", "VEGAN", "FRUIT", "ROOM_TEMP", "SWEET")));
            sampleFoods.add(createFood("APPLE", 50, 2, new ArrayList<>(), Arrays.asList("VEGETARIAN", "VEGAN", "FRUIT", "ROOM_TEMP", "SWEET")));
            sampleFoods.add(createFood("ORANGE JUICE", 25, 5, new ArrayList<>(), Arrays.asList("VEGETARIAN", "VEGAN", "BEVERAGE", "COLD_TEMP", "SWEET")));
            sampleFoods.add(createFood("YOGURT", 35, 4, Arrays.asList("MILK", "DAIRY", "LACTOSE"), Arrays.asList("VEGETARIAN", "COLD_TEMP", "SWEET")));
            sampleFoods.add(createFood("GRANOLA BAR", 45, 3, Arrays.asList("TREE-NUTS", "PEANUTS", "GLUTEN", "WHEAT", "SOY"), Arrays.asList("VEGETARIAN", "ROOM_TEMP", "SWEET")));
            
            // Mid-range options ($10-$20)
            sampleFoods.add(createFood("TURKEY SANDWICH", 20, 12, Arrays.asList("GLUTEN", "WHEAT", "MEAT", "POULTRY", "DAIRY", "EGGS", "MUSTARD"), Arrays.asList("POULTRY", "COLD_TEMP", "SAVORY", "AMERICAN")));
            sampleFoods.add(createFood("GARDEN SALAD", 15, 10, new ArrayList<>(), Arrays.asList("VEGETARIAN", "VEGAN", "COLD_TEMP", "HEALTHY", "SAVORY")));
            sampleFoods.add(createFood("CAESAR SALAD", 15, 11, Arrays.asList("MILK", "DAIRY", "EGGS", "FISH", "GLUTEN", "WHEAT"), Arrays.asList("VEGETARIAN", "COLD_TEMP", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("PASTA", 18, 14, Arrays.asList("GLUTEN", "WHEAT", "EGGS"), Arrays.asList("VEGETARIAN", "HOT_TEMP", "ITALIAN", "SAVORY")));
            sampleFoods.add(createFood("PIZZA SLICE", 25, 8, Arrays.asList("GLUTEN", "WHEAT", "MILK", "DAIRY", "LACTOSE"), Arrays.asList("VEGETARIAN", "HOT_TEMP", "ITALIAN", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("SPAGHETTI MARINARA", 16, 15, Arrays.asList("GLUTEN", "WHEAT"), Arrays.asList("VEGETARIAN", "VEGAN", "HOT_TEMP", "ITALIAN", "SAVORY")));
            sampleFoods.add(createFood("FETTUCCINE ALFREDO", 20, 18, Arrays.asList("GLUTEN", "WHEAT", "MILK", "DAIRY", "EGGS"), Arrays.asList("VEGETARIAN", "HOT_TEMP", "ITALIAN", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("BURRITO", 22, 11, Arrays.asList("GLUTEN", "WHEAT", "MILK", "DAIRY", "LACTOSE", "MEAT", "BEEF", "SOY"), Arrays.asList("BEEF", "HOT_TEMP", "MEXICAN", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("VEGETABLE SOUP", 20, 9, Arrays.asList("SOY"), Arrays.asList("VEGETARIAN", "VEGAN", "HOT_TEMP", "SOUP", "SAVORY")));
            sampleFoods.add(createFood("CHICKEN NOODLE SOUP", 18, 10, Arrays.asList("GLUTEN", "WHEAT", "MEAT", "POULTRY", "EGGS"), Arrays.asList("POULTRY", "HOT_TEMP", "SOUP", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("SUSHI ROLL", 15, 13, Arrays.asList("FISH", "SOY", "SESAME", "EGGS"), Arrays.asList("FISH", "COLD_TEMP", "ASIAN", "JAPANESE", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("CHICKEN WRAP", 18, 10, Arrays.asList("GLUTEN", "WHEAT", "MEAT", "POULTRY", "MILK", "DAIRY"), Arrays.asList("POULTRY", "COLD_TEMP", "SAVORY", "AMERICAN")));
            
            // Chinese/Asian options
            sampleFoods.add(createFood("KUNG PAO CHICKEN", 16, 16, Arrays.asList("GLUTEN", "WHEAT", "MEAT", "POULTRY", "SOY", "PEANUTS"), Arrays.asList("POULTRY", "HOT_TEMP", "ASIAN", "SPICY", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("VEGETABLE FRIED RICE", 14, 10, Arrays.asList("SOY", "EGGS"), Arrays.asList("VEGETARIAN", "HOT_TEMP", "ASIAN", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("BEEF AND PORK FRIED RICE", 16, 14, Arrays.asList("SOY", "EGGS", "MEAT", "BEEF", "PORK"), Arrays.asList("BEEF", "PORK", "HOT_TEMP", "ASIAN", "SPICY", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("MAPO TOFU", 15, 11, Arrays.asList("SOY", "SESAME"), Arrays.asList("VEGETARIAN", "VEGAN", "HOT_TEMP", "ASIAN", "SPICY", "SAVORY")));
            sampleFoods.add(createFood("EGG DROP SOUP", 12, 8, Arrays.asList("EGGS", "SOY"), Arrays.asList("VEGETARIAN", "HOT_TEMP", "ASIAN", "SOUP", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("GENERAL TSO'S CHICKEN", 16, 15, Arrays.asList("GLUTEN", "WHEAT", "MEAT", "POULTRY", "SOY", "SESAME"), Arrays.asList("POULTRY", "HOT_TEMP", "ASIAN", "SPICY", "SWEET", "SAVORY")));
            sampleFoods.add(createFood("ORANGE CHICKEN", 18, 14, Arrays.asList("GLUTEN", "WHEAT", "MEAT", "POULTRY", "SOY", "SESAME"), Arrays.asList("POULTRY", "HOT_TEMP", "ASIAN", "SWEET", "SAVORY")));
            sampleFoods.add(createFood("SWEET AND SOUR PORK", 15, 13, Arrays.asList("GLUTEN", "WHEAT", "MEAT", "PORK", "SOY"), Arrays.asList("PORK", "HOT_TEMP", "ASIAN", "SWEET", "SOUR", "SAVORY")));
            sampleFoods.add(createFood("ROASTED VEGETABLE CURRY", 14, 18, Arrays.asList("SOY"), Arrays.asList("VEGETARIAN", "VEGAN", "HOT_TEMP", "ASIAN", "SPICY", "HEALTHY", "SAVORY")));
            sampleFoods.add(createFood("LO MEIN NOODLES", 16, 12, Arrays.asList("GLUTEN", "WHEAT", "SOY", "EGGS"), Arrays.asList("VEGETARIAN", "HOT_TEMP", "ASIAN", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("CHOW MEIN", 16, 11, Arrays.asList("GLUTEN", "WHEAT", "SOY", "EGGS"), Arrays.asList("VEGETARIAN", "HOT_TEMP", "ASIAN", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("HOT AND SOUR SOUP", 14, 9, Arrays.asList("SOY", "EGGS", "MEAT", "PORK"), Arrays.asList("PORK", "HOT_TEMP", "ASIAN", "SOUP", "SPICY", "SOUR", "SAVORY")));
            sampleFoods.add(createFood("SPRING ROLLS", 20, 7, Arrays.asList("GLUTEN", "WHEAT", "SOY"), Arrays.asList("VEGETARIAN", "HOT_TEMP", "ASIAN", "SAVORY")));
            sampleFoods.add(createFood("WONTON SOUP", 14, 10, Arrays.asList("GLUTEN", "WHEAT", "SOY", "EGGS", "MEAT", "PORK"), Arrays.asList("PORK", "HOT_TEMP", "ASIAN", "SOUP", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("MONGOLIAN BEEF", 14, 17, Arrays.asList("GLUTEN", "WHEAT", "MEAT", "BEEF", "SOY", "SESAME"), Arrays.asList("BEEF", "HOT_TEMP", "ASIAN", "SPICY", "SAVORY", "SALTY")));
            
            // Premium options (over $20)
            sampleFoods.add(createFood("STEAK", 10, 28, Arrays.asList("MEAT", "BEEF"), Arrays.asList("BEEF", "HOT_TEMP", "PREMIUM", "SAVORY", "SALTY", "AMERICAN")));
            sampleFoods.add(createFood("SALMON", 12, 24, Arrays.asList("FISH"), Arrays.asList("FISH", "HOT_TEMP", "PREMIUM", "HEALTHY", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("LOBSTER", 8, 35, Arrays.asList("SHELLFISH"), Arrays.asList("SHELLFISH", "HOT_TEMP", "PREMIUM", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("SUSHI PLATTER", 10, 32, Arrays.asList("FISH", "SHELLFISH", "SOY", "SESAME", "EGGS"), Arrays.asList("FISH", "SHELLFISH", "COLD_TEMP", "ASIAN", "JAPANESE", "PREMIUM", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("RIBEYE", 8, 30, Arrays.asList("MEAT", "BEEF"), Arrays.asList("BEEF", "HOT_TEMP", "PREMIUM", "SAVORY", "SALTY", "AMERICAN")));
            
            // Vegan/Vegetarian options
            sampleFoods.add(createFood("VEGGIE BURGER", 20, 11, Arrays.asList("GLUTEN", "WHEAT", "SOY", "SESAME"), Arrays.asList("VEGETARIAN", "HOT_TEMP", "SAVORY", "SALTY", "AMERICAN")));
            sampleFoods.add(createFood("TOFU BOWL", 18, 12, Arrays.asList("SOY", "SESAME"), Arrays.asList("VEGETARIAN", "VEGAN", "HOT_TEMP", "ASIAN", "SAVORY", "SALTY")));
            sampleFoods.add(createFood("QUINOA SALAD", 15, 13, new ArrayList<>(), Arrays.asList("VEGETARIAN", "VEGAN", "COLD_TEMP", "HEALTHY", "SAVORY")));
            sampleFoods.add(createFood("HUMMUS WRAP", 20, 9, Arrays.asList("GLUTEN", "WHEAT", "SESAME"), Arrays.asList("VEGETARIAN", "VEGAN", "ROOM_TEMP", "SAVORY")));
            
            // Desserts
            sampleFoods.add(createFood("CHOCOLATE CAKE", 12, 7, Arrays.asList("GLUTEN", "WHEAT", "MILK", "DAIRY", "LACTOSE", "EGGS", "SOY"), Arrays.asList("VEGETARIAN", "DESSERT", "ROOM_TEMP", "SWEET")));
            sampleFoods.add(createFood("ICE CREAM", 25, 6, Arrays.asList("MILK", "DAIRY", "LACTOSE", "EGGS"), Arrays.asList("VEGETARIAN", "DESSERT", "COLD_TEMP", "SWEET")));
            sampleFoods.add(createFood("COOKIES", 30, 5, Arrays.asList("GLUTEN", "WHEAT", "MILK", "DAIRY", "EGGS", "SOY", "TREE-NUTS", "PEANUTS"), Arrays.asList("VEGETARIAN", "DESSERT", "ROOM_TEMP", "SWEET")));
            sampleFoods.add(createFood("FRUIT SALAD", 20, 8, new ArrayList<>(), Arrays.asList("VEGETARIAN", "VEGAN", "COLD_TEMP", "HEALTHY", "DESSERT", "FRUIT", "SWEET")));
            
            // Save all sample foods
            foodRepository.saveAll(sampleFoods);
            System.out.println("Successfully created " + sampleFoods.size() + " sample food items with comprehensive allergen information!");

            // Create some sample orders so analytics have data (assigned to admin user)
            try {
                final java.util.List<Food> foodsInDb = foodRepository.findAll();
                final User adminUser = userRepository.findByUsername("admin").orElse(null);
                if (adminUser != null && !foodsInDb.isEmpty()) {
                    final java.util.List<Order> sampleOrders = new java.util.ArrayList<>();
                    for (int i = 0; i < 12; i++) {
                        final Order o = new Order();
                        o.setName("Sample Order " + (i + 1));
                        // pick 1-3 foods
                        final java.util.List<Food> chosen = new java.util.ArrayList<>();
                        chosen.add(foodsInDb.get(i % foodsInDb.size()));
                        if (i % 3 != 0) chosen.add(foodsInDb.get((i + 1) % foodsInDb.size()));
                        if (i % 5 == 0) chosen.add(foodsInDb.get((i + 2) % foodsInDb.size()));
                        o.setFoods(chosen);
                        o.setIsFulfilled(i % 2 == 0);
                        o.setUser(adminUser);
                        o.setCreatedAt(LocalDateTime.now().minusDays(i));
                        sampleOrders.add(o);
                    }

                    orderRepository.saveAll(sampleOrders);
                    System.out.println("Created " + sampleOrders.size() + " sample orders for analytics.");
                }
            } catch (final Exception e) {
                System.out.println("Failed to create sample orders: " + e.getMessage());
            }
        } else {
            System.out.println("Food database already contains " + foodRepository.count() + " items - skipping sample data creation.");
        }
    }
}
