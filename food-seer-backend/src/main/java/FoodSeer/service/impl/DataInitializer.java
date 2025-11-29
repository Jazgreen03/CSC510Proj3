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

/**
 * Initializes application data such as a default admin user.
 */
@Component
public class DataInitializer {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final FoodRepository foodRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin-user-password:admin}")
    private String adminPassword;

    public DataInitializer(UserRepository userRepository,
                           RoleRepository roleRepository,
                           FoodRepository foodRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.foodRepository = foodRepository;
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

        // Initialize sample food data if database is empty OR if foods don't have tags yet
        long foodCount = foodRepository.count();
        boolean foodsNeedTags = foodCount > 0 && foodRepository.findAll().stream()
            .anyMatch(f -> f.getTags() == null || f.getTags().isEmpty());
        
        if (foodCount == 0 || foodsNeedTags) {
            if (foodsNeedTags) {
                System.out.println("Foods exist but lack tags - clearing and reinitializing with tags...");
                foodRepository.deleteAll();
            } else {
                System.out.println("Database empty - initializing sample food data...");
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
            sampleFoods.add(createFood("COFFEE", 50, 3, Arrays.asList("CAFFEINE"), Arrays.asList("HOT", "BEVERAGE")));
            sampleFoods.add(createFood("TEA", 40, 2, Arrays.asList("CAFFEINE"), Arrays.asList("HOT", "BEVERAGE")));
            sampleFoods.add(createFood("BAGEL", 30, 4, Arrays.asList("GLUTEN", "WHEAT", "SESAME"), Arrays.asList("BREAKFAST")));
            sampleFoods.add(createFood("BANANA", 60, 1, new ArrayList<>(), Arrays.asList("VEGETARIAN", "VEGAN", "FRUIT")));
            sampleFoods.add(createFood("APPLE", 50, 2, new ArrayList<>(), Arrays.asList("VEGETARIAN", "VEGAN", "FRUIT")));
            sampleFoods.add(createFood("ORANGE JUICE", 25, 5, new ArrayList<>(), Arrays.asList("VEGETARIAN", "VEGAN", "BEVERAGE", "COLD")));
            sampleFoods.add(createFood("YOGURT", 35, 4, Arrays.asList("MILK", "DAIRY", "LACTOSE"), Arrays.asList("VEGETARIAN")));
            sampleFoods.add(createFood("GRANOLA BAR", 45, 3, Arrays.asList("TREE-NUTS", "PEANUTS", "GLUTEN", "WHEAT", "SOY"), Arrays.asList("VEGETARIAN")));
            
            // Mid-range options ($10-$20)
            sampleFoods.add(createFood("TURKEY SANDWICH", 20, 12, Arrays.asList("GLUTEN", "WHEAT", "MEAT", "POULTRY", "DAIRY", "EGGS", "MUSTARD"), Arrays.asList("POULTRY", "COLD")));
            sampleFoods.add(createFood("GARDEN SALAD", 15, 10, new ArrayList<>(), Arrays.asList("VEGETARIAN", "VEGAN", "COLD", "HEALTHY")));
            sampleFoods.add(createFood("CAESAR SALAD", 15, 11, Arrays.asList("MILK", "DAIRY", "EGGS", "FISH", "GLUTEN", "WHEAT"), Arrays.asList("VEGETARIAN", "COLD")));
            sampleFoods.add(createFood("PASTA", 18, 14, Arrays.asList("GLUTEN", "WHEAT", "EGGS"), Arrays.asList("VEGETARIAN", "HOT")));
            sampleFoods.add(createFood("PIZZA SLICE", 25, 8, Arrays.asList("GLUTEN", "WHEAT", "MILK", "DAIRY", "LACTOSE"), Arrays.asList("VEGETARIAN", "HOT")));
            sampleFoods.add(createFood("BURRITO", 22, 11, Arrays.asList("GLUTEN", "WHEAT", "MILK", "DAIRY", "LACTOSE", "MEAT", "BEEF", "SOY"), Arrays.asList("BEEF", "HOT", "MEXICAN")));
            sampleFoods.add(createFood("VEGETABLE SOUP", 20, 9, Arrays.asList("SOY"), Arrays.asList("VEGETARIAN", "VEGAN", "HOT", "SOUP")));
            sampleFoods.add(createFood("CHICKEN NOODLE SOUP", 18, 10, Arrays.asList("GLUTEN", "WHEAT", "MEAT", "POULTRY", "EGGS"), Arrays.asList("POULTRY", "HOT", "SOUP")));
            sampleFoods.add(createFood("SUSHI ROLL", 15, 13, Arrays.asList("FISH", "SOY", "SESAME", "EGGS"), Arrays.asList("FISH", "COLD", "ASIAN", "JAPANESE")));
            sampleFoods.add(createFood("CHICKEN WRAP", 18, 10, Arrays.asList("GLUTEN", "WHEAT", "MEAT", "POULTRY", "MILK", "DAIRY"), Arrays.asList("POULTRY", "COLD")));
            
            // Chinese options
            sampleFoods.add(createFood("KUNG PAO CHICKEN", 16, 13, Arrays.asList("GLUTEN", "WHEAT", "MEAT", "POULTRY", "SOY", "PEANUTS"), Arrays.asList("POULTRY", "HOT", "ASIAN", "SPICY")));
            sampleFoods.add(createFood("VEGETABLE FRIED RICE", 14, 10, Arrays.asList("SOY", "EGGS"), Arrays.asList("VEGETARIAN", "HOT", "ASIAN")));
            sampleFoods.add(createFood("MAPO TOFU", 15, 11, Arrays.asList("SOY", "SESAME"), Arrays.asList("VEGETARIAN", "VEGAN", "HOT", "ASIAN", "SPICY")));
            sampleFoods.add(createFood("EGG DROP SOUP", 12, 8, Arrays.asList("EGGS", "SOY"), Arrays.asList("VEGETARIAN", "HOT", "ASIAN", "SOUP")));
            
            // Premium options (over $20)
            sampleFoods.add(createFood("STEAK", 10, 28, Arrays.asList("MEAT", "BEEF"), Arrays.asList("BEEF", "HOT", "PREMIUM")));
            sampleFoods.add(createFood("SALMON", 12, 24, Arrays.asList("FISH"), Arrays.asList("FISH", "HOT", "PREMIUM", "HEALTHY")));
            sampleFoods.add(createFood("LOBSTER", 8, 35, Arrays.asList("SHELLFISH"), Arrays.asList("SHELLFISH", "HOT", "PREMIUM")));
            sampleFoods.add(createFood("SUSHI PLATTER", 10, 32, Arrays.asList("FISH", "SHELLFISH", "SOY", "SESAME", "EGGS"), Arrays.asList("FISH", "SHELLFISH", "COLD", "ASIAN", "JAPANESE", "PREMIUM")));
            sampleFoods.add(createFood("RIBEYE", 8, 30, Arrays.asList("MEAT", "BEEF"), Arrays.asList("BEEF", "HOT", "PREMIUM")));
            
            // Vegan/Vegetarian options
            sampleFoods.add(createFood("VEGGIE BURGER", 20, 11, Arrays.asList("GLUTEN", "WHEAT", "SOY", "SESAME"), Arrays.asList("VEGETARIAN", "HOT")));
            sampleFoods.add(createFood("TOFU BOWL", 18, 12, Arrays.asList("SOY", "SESAME"), Arrays.asList("VEGETARIAN", "VEGAN", "HOT", "ASIAN")));
            sampleFoods.add(createFood("QUINOA SALAD", 15, 13, new ArrayList<>(), Arrays.asList("VEGETARIAN", "VEGAN", "COLD", "HEALTHY")));
            sampleFoods.add(createFood("HUMMUS WRAP", 20, 9, Arrays.asList("GLUTEN", "WHEAT", "SESAME"), Arrays.asList("VEGETARIAN", "VEGAN", "HOT")));
            
            // Desserts
            sampleFoods.add(createFood("CHOCOLATE CAKE", 12, 7, Arrays.asList("GLUTEN", "WHEAT", "MILK", "DAIRY", "LACTOSE", "EGGS", "SOY"), Arrays.asList("VEGETARIAN", "DESSERT", "SWEET")));
            sampleFoods.add(createFood("ICE CREAM", 25, 6, Arrays.asList("MILK", "DAIRY", "LACTOSE", "EGGS"), Arrays.asList("VEGETARIAN", "DESSERT", "COLD", "SWEET")));
            sampleFoods.add(createFood("COOKIES", 30, 5, Arrays.asList("GLUTEN", "WHEAT", "MILK", "DAIRY", "EGGS", "SOY", "TREE-NUTS", "PEANUTS"), Arrays.asList("VEGETARIAN", "DESSERT", "COLD", "SWEET")));
            sampleFoods.add(createFood("FRUIT SALAD", 20, 8, new ArrayList<>(), Arrays.asList("VEGETARIAN", "VEGAN", "COLD", "HEALTHY", "DESSERT", "FRUIT")));
            
            // Save all sample foods
            foodRepository.saveAll(sampleFoods);
            System.out.println("Successfully created " + sampleFoods.size() + " sample food items with comprehensive allergen information!");
        } else {
            System.out.println("Food database already contains " + foodRepository.count() + " items - skipping sample data creation.");
        }
    }
}
