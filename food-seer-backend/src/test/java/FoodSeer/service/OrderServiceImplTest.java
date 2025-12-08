package FoodSeer.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
import FoodSeer.entity.Order;
import FoodSeer.entity.User;
import FoodSeer.mapper.FoodMapper;
import FoodSeer.repositories.ConversationRepository;
import FoodSeer.repositories.FoodRepository;
import FoodSeer.repositories.InventoryRepository;
import FoodSeer.repositories.OrderRepository;
import FoodSeer.repositories.RecommendationFeedbackRepository;
import FoodSeer.repositories.UserRepository;

/**
 * Tests OrderService and OrderServiceImpl classes for the FoodSeer project.
 */
@SpringBootTest
class OrderServiceImplTest {

    /** Reference to Food repository */
    @Autowired
    private FoodRepository foodRepository;

    /** Reference to Inventory repository */
    @Autowired
    private InventoryRepository inventoryRepository;

    /** Reference to Order repository */
    @Autowired
    private OrderRepository orderRepository;

    /** Reference to Order service */
    @Autowired
    private OrderService orderService;

    /** Reference to Inventory service */
    @Autowired
    private InventoryService inventoryService;

    /** Reference to Food service */
    @Autowired
    private FoodService foodService;

    /** Reference to User repository */
    @Autowired
    private UserRepository userRepository;

    /** Reference to Conversation repository */
    @Autowired
    private ConversationRepository conversationRepository;

    /** Reference to RecommendationFeedback repository */
    @Autowired
    private RecommendationFeedbackRepository recommendationFeedbackRepository;

    /**
     * Clears all repositories before each test.
     */
    @BeforeEach
    public void setUp() throws Exception {
        // Delete in proper order to avoid foreign key constraint violations
        recommendationFeedbackRepository.deleteAll();
        conversationRepository.deleteAll();
        orderRepository.deleteAll();
        foodRepository.deleteAll();
        inventoryRepository.deleteAll();
        userRepository.deleteAll();

        // Create test users that match @WithMockUser usernames
        final User customer = User.builder()
                .username("customer")
                .email("customer@test.com")
                .password("password")
                .role("ROLE_CUSTOMER")
                .build();
        userRepository.save(customer);

        final User staff = User.builder()
                .username("staff")
                .email("staff@test.com")
                .password("password")
                .role("ROLE_STAFF")
                .build();
        userRepository.save(staff);
    }

    /**
     * Tests creating an order with valid data.
     */
    @Test
    @Transactional
    @WithMockUser(username = "customer", roles = "CUSTOMER")
    void testCreateOrder() {
        // Create and save a food item
        final FoodDto food1 = new FoodDto();
        food1.setFoodName("COFFEE");
        food1.setAmount(10);
        food1.setPrice(5);
        food1.setAllergies(new ArrayList<>(List.of("CAFFEINE"))); // ✅ mutable list

        final FoodDto savedFood = foodService.createFood(food1);

        // Create order containing that food
        final OrderDto orderDto = new OrderDto(0L, "Order1");
        orderDto.setFoods(new ArrayList<>(List.of(FoodMapper.mapToFood(savedFood)))); // ✅ mutable list

        final OrderDto savedOrder = orderService.createOrder(orderDto);

        assertAll("Order contents",
                () -> assertEquals("Order1", savedOrder.getName()),
                () -> assertFalse(savedOrder.getIsFulfilled()));
    }

    /**
     * Tests fulfilling an order and verifying inventory updates accordingly.
     */
    @Test
    @Transactional
    @WithMockUser(username = "staff", roles = "STAFF")
    void testFulfillOrder() {
        // Initialize inventory
        final List<Food> foods = new ArrayList<>();
        final Food f1 = new Food("COFFEE", 5, 10, new ArrayList<>(List.of("CAFFEINE"))); // ✅ mutable list
        final Food f2 = new Food("MILK", 5, 6, new ArrayList<>(List.of("LACTOSE")));     // ✅ mutable list
        final Food f3 = new Food("SUGAR", 5, 4, new ArrayList<>(List.of("GLUCOSE")));    // ✅ mutable list

        foods.add(f1);
        foods.add(f2);
        foods.add(f3);

        final InventoryDto inventoryDto = new InventoryDto(1L, foods);
        inventoryService.createInventory(inventoryDto);

        // Save foods in DB
        foodRepository.saveAll(foods);

        // Create an order with one item
        final OrderDto orderDto = new OrderDto(0L, "Order1");
        orderDto.setFoods(new ArrayList<>(List.of(f1))); // ✅ mutable list

        assertEquals(0, orderService.getAllOrders().size());

        final OrderDto savedOrder = orderService.createOrder(orderDto);

        assertAll("Order contents before fulfillment",
                () -> assertEquals("Order1", savedOrder.getName()),
                () -> assertFalse(savedOrder.getIsFulfilled()));

        assertEquals(1, orderService.getAllOrders().size());
        assertEquals(0, orderService.getAllFulfilledOrders().size());

        // Fulfill the order
        final OrderDto fulfilledOrder = orderService.fulfillOrder(savedOrder.getId());

        assertAll("Order contents after fulfillment",
                () -> assertEquals("Order1", fulfilledOrder.getName()),
                () -> assertTrue(fulfilledOrder.getIsFulfilled()));

        assertEquals(1, orderService.getAllFulfilledOrders().size());
        assertEquals(savedOrder.getId(), orderService.getOrderById(savedOrder.getId()).getId());
    }
    
    @Test
    @Transactional
    void testCreateOrderNoAuthenticatedUser() {
        // No @WithMockUser here -> simulating not logged in
        
        final Food food = new Food("COFFEE", 5, 10, new ArrayList<>());
        foodRepository.save(food);

        OrderDto orderDto = new OrderDto(0L, "OrderNoUser");
        orderDto.setFoods(new ArrayList<>(List.of(food)));

        IllegalStateException ex = org.junit.jupiter.api.Assertions.assertThrows(
                IllegalStateException.class, () -> orderService.createOrder(orderDto));

        assertEquals("No authenticated user found", ex.getMessage());
    }

    @Test
    @Transactional
    @WithMockUser(username = "customer", roles = "CUSTOMER")
    void testFulfillOrderNotEnoughStock() {
        // Setup inventory with enough stock initially
        Food food = new Food("TEA", 2, 3, new ArrayList<>());
        foodRepository.save(food);
        inventoryService.createInventory(new InventoryDto(1L, new ArrayList<>(List.of(food))));

        // Create order with TWO TEAs (stock is 2, so this should succeed)
        OrderDto orderDto = new OrderDto(0L, "TeaOrder");
        orderDto.setFoods(new ArrayList<>(List.of(food, food))); // ordering 2 units

        OrderDto savedOrder = orderService.createOrder(orderDto);

        // Now reduce stock to 1 (simulating stock being used by another order)
        food.setAmount(1);
        foodRepository.save(food);
        inventoryService.updateInventory(new InventoryDto(1L, new ArrayList<>(List.of(food))));

        // Now fulfillment should fail because stock is insufficient
        IllegalArgumentException ex = org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class, () -> orderService.fulfillOrder(savedOrder.getId()));

        assertEquals(
            "Not enough stock to fulfill the order for TEA. Need: 2, Available: 1",
            ex.getMessage()
        );
    }

    @Test
    @Transactional
    void testGetCurrentUserOrdersNoUser() {
        IllegalStateException ex = org.junit.jupiter.api.Assertions.assertThrows(
                IllegalStateException.class, () -> orderService.getCurrentUserOrders());

        assertEquals("No authenticated user found", ex.getMessage());
    }

    @Test
    @Transactional
    void testGetCurrentUserFulfilledOrdersNoUser() {
        IllegalStateException ex = org.junit.jupiter.api.Assertions.assertThrows(
                IllegalStateException.class, () -> orderService.getCurrentUserFulfilledOrders());

        assertEquals("No authenticated user found", ex.getMessage());
    }

    @Test
    @Transactional
    void testGetCurrentUserUnfulfilledOrdersNoUser() {
        IllegalStateException ex = org.junit.jupiter.api.Assertions.assertThrows(
                IllegalStateException.class, () -> orderService.getCurrentUserUnfulfilledOrders());

        assertEquals("No authenticated user found", ex.getMessage());
    }
    
    @Test
    @Transactional
    @WithMockUser(username = "customer", roles = "CUSTOMER")
    void testGetCurrentUserOrdersReturnsList() {
        // Create food
        Food food = new Food("COOKIE", 10, 3, new ArrayList<>());
        foodRepository.save(food);

        // Create order
        OrderDto orderDto = new OrderDto(0L, "Order-Customer");
        orderDto.setFoods(new ArrayList<>(List.of(food)));
        orderService.createOrder(orderDto);

        List<OrderDto> orders = orderService.getCurrentUserOrders();
        assertEquals(1, orders.size());
        assertEquals("Order-Customer", orders.get(0).getName());
    }

    @Test
    @Transactional
    @WithMockUser(username = "customer", roles = "CUSTOMER")
    void testGetCurrentUserFulfilledOrdersReturnsOnlyFulfilled() {
        // Inventory & food
        Food food = new Food("PIE", 5, 4, new ArrayList<>());
        foodRepository.save(food);
        inventoryService.createInventory(new InventoryDto(1L, new ArrayList<>(List.of(food))));

        // Create order
        OrderDto orderDto = new OrderDto(0L, "PieOrder");
        orderDto.setFoods(new ArrayList<>(List.of(food)));
        OrderDto saved = orderService.createOrder(orderDto);

        // Mark fulfilled manually
        Order orderEntity = orderRepository.findById(saved.getId()).get();
        orderEntity.setIsFulfilled(true);
        orderRepository.save(orderEntity);

        List<OrderDto> orders = orderService.getCurrentUserFulfilledOrders();
        assertEquals(1, orders.size());
        assertTrue(orders.get(0).getIsFulfilled());
    }

    @Test
    @Transactional
    @WithMockUser(username = "customer", roles = "CUSTOMER")
    void testGetCurrentUserUnfulfilledOrdersReturnsOnlyUnfulfilled() {
        Food food = new Food("LATTE", 10, 5, new ArrayList<>());
        foodRepository.save(food);
        inventoryService.createInventory(new InventoryDto(1L, new ArrayList<>(List.of(food))));

        // Create order but do NOT fulfill
        OrderDto orderDto = new OrderDto(0L, "LatteOrder");
        orderDto.setFoods(new ArrayList<>(List.of(food)));
        orderService.createOrder(orderDto);

        List<OrderDto> orders = orderService.getCurrentUserUnfulfilledOrders();
        assertEquals(1, orders.size());
        assertFalse(orders.get(0).getIsFulfilled());
    }

    @Test
    @Transactional
    @WithMockUser(username = "customer", roles = "CUSTOMER")
    void testGetAllUnfulfilledOrders() {
        Food food = new Food("MUFFIN", 10, 3, new ArrayList<>());
        foodRepository.save(food);
        inventoryService.createInventory(new InventoryDto(1L, new ArrayList<>(List.of(food))));

        // Create unfulfilled order
        OrderDto orderDto = new OrderDto(0L, "MuffinOrder");
        orderDto.setFoods(new ArrayList<>(List.of(food)));
        orderService.createOrder(orderDto);

        List<OrderDto> unfulfilled = orderService.getAllUnfulfilledOrders();
        assertEquals(1, unfulfilled.size());
        assertFalse(unfulfilled.get(0).getIsFulfilled());
    }

    @Test
    @Transactional
    @WithMockUser(username = "customer", roles = "CUSTOMER")
    void testFoodAvailabilityTrue() {
        // Set up food and inventory
        Food food = new Food("BREAD", 5, 2, new ArrayList<>());
        foodRepository.save(food);
        inventoryService.createInventory(new InventoryDto(1L, new ArrayList<>(List.of(food))));

        // Create order with 1 bread
        OrderDto orderDto = new OrderDto(0L, "BreadOrder");
        orderDto.setFoods(new ArrayList<>(List.of(food)));
        OrderDto savedOrder = orderService.createOrder(orderDto);

        // Fulfill order successfully (means availability returned true)
        OrderDto fulfilled = orderService.fulfillOrder(savedOrder.getId());
        assertTrue(fulfilled.getIsFulfilled());
    }

    @Test
    @Transactional
    @WithMockUser(username = "customer", roles = "CUSTOMER")
    void testOrderMapper_mapToOrder() {
        // Arrange: create a FoodDto list
        FoodDto f1 = new FoodDto("Latte", 2, 5, List.of("MILK"));
        FoodDto f2 = new FoodDto("Tea", 1, 3, List.of("NONE"));

        OrderDto orderDto = new OrderDto(1L, "MorningOrder");
        orderDto.setFoods(new ArrayList<>(List.of(
                FoodMapper.mapToFood(f1),
                FoodMapper.mapToFood(f2)
        )));
        orderDto.setIsFulfilled(true);

        // Act: convert DTO to entity using mapper
        Order mappedOrder = FoodSeer.mapper.OrderMapper.mapToOrder(orderDto);

        // Assert: Check fields
        assertAll(
            () -> assertEquals(orderDto.getId(), mappedOrder.getId()),
            () -> assertEquals(orderDto.getName(), mappedOrder.getName()),
            () -> assertEquals(2, mappedOrder.getFoods().size()),
            
            // Food #1 check
            () -> assertEquals("LATTE", mappedOrder.getFoods().get(0).getFoodName()),
            () -> assertEquals(2, mappedOrder.getFoods().get(0).getAmount()),
            () -> assertEquals(5, mappedOrder.getFoods().get(0).getPrice()),

            // Food #2 check
            () -> assertEquals("TEA", mappedOrder.getFoods().get(1).getFoodName()),
            () -> assertEquals(1, mappedOrder.getFoods().get(1).getAmount()),
            () -> assertEquals(3, mappedOrder.getFoods().get(1).getPrice()),

            // Fulfillment flag
            () -> assertTrue(mappedOrder.getIsFulfilled())
        );

        // Ensure we created NEW Food entities, not reusing objects
        assertNotSame(orderDto.getFoods().get(0), mappedOrder.getFoods().get(0));
        assertNotSame(orderDto.getFoods().get(1), mappedOrder.getFoods().get(1));
    }

}
