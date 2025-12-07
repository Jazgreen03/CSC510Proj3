package FoodSeer.repositories;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.transaction.annotation.Transactional;

import FoodSeer.dto.FoodDto;
import FoodSeer.dto.InventoryDto;
import FoodSeer.dto.OrderDto;
import FoodSeer.entity.Food;
import FoodSeer.entity.User;
import FoodSeer.service.FoodService;
import FoodSeer.service.InventoryService;
import FoodSeer.service.OrderService;

/**
 * Tests the OrderRepository for persistence and retrieval of food orders.
 */
@SpringBootTest
class OrderRepositoryTest {

    /** Reference to order repository */
    @Autowired
    private OrderRepository orderRepository;

    /** Reference to food repository */
    @Autowired
    private FoodRepository foodRepository;

    /** Reference to food service */
    @Autowired
    private FoodService foodService;

    /** Reference to order service */
    @Autowired
    private OrderService orderService;

    /** Reference to InventoryService */
    @Autowired
    private InventoryService inventoryService;

    /** Reference to User repository */
    @Autowired
    private UserRepository userRepository;

    /** Reference to Conversation repository */
    @Autowired
    private ConversationRepository conversationRepository;

    /**
     * Sets up the test case by clearing tables and adding initial food/inventory data.
     */
    @BeforeEach
    public void setUp() throws Exception {
        // Delete in proper order to avoid foreign key constraint violations
        conversationRepository.deleteAll();
        orderRepository.deleteAll();
        foodRepository.deleteAll();
        userRepository.deleteAll();

        // Create test user that matches @WithMockUser username
        final User customer = User.builder()
                .username("customer")
                .email("customer@test.com")
                .password("password")
                .role("ROLE_CUSTOMER")
                .build();
        userRepository.save(customer);

        // Initialize inventory with foods
        final List<Food> foods = new ArrayList<>();

        final Food f1 = new Food("COFFEE", 10, 5, List.of("CAFFEINE"));
        final Food f2 = new Food("MILK", 8, 3, List.of("LACTOSE"));
        final Food f3 = new Food("SUGAR", 15, 2, List.of("GLUCOSE"));

        foods.add(f1);
        foods.add(f2);
        foods.add(f3);

        final InventoryDto inventoryDto = new InventoryDto(1L, foods);
        inventoryService.createInventory(inventoryDto);

        foodRepository.saveAll(foods);
    }

    /**
     * Tests that orders can be created, saved, and retrieved successfully.
     */
    @Test
    @Transactional
    @WithMockUser(username = "customer", roles = "CUSTOMER")
    void testOrderRepository() {
        final List<Food> foods = foodRepository.findAll();

        // Create an order with a subset of foods
        final OrderDto orderDto = new OrderDto(0L, "Order1");
        orderDto.setFoods(foods.subList(0, 2));

        final OrderDto savedOrder = orderService.createOrder(orderDto);

        // Verify that the order was persisted correctly
        assertEquals(savedOrder.getId(),
                orderRepository.getReferenceById(savedOrder.getId()).getId(),
                "The saved and retrieved order IDs should match");
    }
}
