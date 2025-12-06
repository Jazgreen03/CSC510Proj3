package FoodSeer.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import FoodSeer.TestUtils;
import FoodSeer.dto.InventoryDto;
import FoodSeer.dto.OrderDto;
import FoodSeer.entity.Food;
import FoodSeer.entity.User;
import FoodSeer.repositories.ConversationRepository;
import FoodSeer.repositories.FoodRepository;
import FoodSeer.repositories.OrderRepository;
import FoodSeer.repositories.UserRepository;
import FoodSeer.service.InventoryService;
import FoodSeer.service.OrderService;

/**
 * Tests Controller for API endpoints for an Order.
 */
@SpringBootTest
@AutoConfigureMockMvc
class OrderControllerTest {

    /** Mock MVC for testing controller */
    @Autowired
    private MockMvc mvc;

    /** Repository for orders */
    @Autowired
    private OrderRepository orderRepository;

    /** Repository for food items */
    @Autowired
    private FoodRepository foodRepository;

    /** Service for orders */
    @Autowired
    private OrderService orderService;

    /** Service for inventory */
    @Autowired
    private InventoryService inventoryService;

    /** Repository for users */
    @Autowired
    private UserRepository userRepository;

    /** Repository for conversations */
    @Autowired
    private ConversationRepository conversationRepository;

    /**
     * Sets up test case by clearing repositories and creating sample data.
     */
    @BeforeEach
    public void setUp() throws Exception {
        // Delete in proper order to avoid foreign key constraint violations
        conversationRepository.deleteAll();
        orderRepository.deleteAll();
        foodRepository.deleteAll();
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

        // Create initial inventory
        final List<Food> foods = new ArrayList<>();
        final Food coffee = new Food("Coffee", 20, 10, List.of("CAFFEINE"));
        final Food matcha = new Food("Matcha", 15, 8, List.of("CAFFEINE"));
        final Food sugar = new Food("Sugar", 25, 3, List.of("GLUCOSE"));
        foods.add(coffee);
        foods.add(matcha);
        foods.add(sugar);

        final InventoryDto inventoryDto = new InventoryDto(1L, foods);
        inventoryService.createInventory(inventoryDto);

        // Add food items to repo
        foodRepository.saveAll(foods);
    }

    @Test
    @Transactional
    @WithMockUser(username = "customer", roles = "CUSTOMER")
    void testGetAndCreateOrder() throws Exception {
        final List<Food> foods = foodRepository.findAll();

        final OrderDto orderDto = new OrderDto(0L, "Order1");
        orderDto.setFoods(foods.subList(0, 2)); // use some foods

        final OrderDto savedOrder = orderService.createOrder(orderDto);

        mvc.perform(get("/api/orders"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/orders/fulfilledOrders"))
                .andExpect(status().isOk());

        mvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestUtils.asJsonString(orderDto))  // <-- directly send the DTO
                .accept(MediaType.APPLICATION_JSON))
            	.andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        mvc.perform(get("/api/orders/" + savedOrder.getId()))
                .andExpect(status().isOk());
    }

    @Test
    @Transactional
    @WithMockUser(username = "staff", roles = "STAFF")
    void testFulfillOrder() throws Exception {
        final List<Food> foods = foodRepository.findAll();
        final OrderDto orderDto = new OrderDto(0L, "Order2");
        orderDto.setFoods(foods.subList(0, 1));

        final OrderDto savedOrder = orderService.createOrder(orderDto);

        mvc.perform(get("/api/orders"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/orders/fulfilledOrders"))
                .andExpect(status().isOk());

        mvc.perform(post("/api/orders/fulfillOrder")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestUtils.asJsonString(savedOrder))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @Transactional
    @WithMockUser(username = "staff", roles = "STAFF")
    void testGetUnfulfilledOrders() throws Exception {
        final List<Food> foods = foodRepository.findAll();
        final OrderDto orderDto = new OrderDto(0L, "Order3");
        orderDto.setFoods(foods.subList(1, 3));

        orderService.createOrder(orderDto);

        mvc.perform(get("/api/orders/unfulfilledOrders"))
                .andExpect(status().isOk());
    }
    
    @Test
    @Transactional
    @WithMockUser(username = "staff", roles = "STAFF")
    void testFulfillOrder_OrderNotFound() throws Exception {
        OrderDto fake = new OrderDto(999L, "FakeOrder");

        mvc.perform(post("/api/orders/fulfillOrder")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestUtils.asJsonString(fake)))
            .andExpect(status().isPreconditionFailed()); // 412
    }

    @Test
    @Transactional
    @WithMockUser(username = "staff", roles = "STAFF")
    void testFulfillOrder_AlreadyFulfilled() throws Exception {
        Food food = foodRepository.findAll().get(0);

        OrderDto o = new OrderDto(0L, "FulfilledTest");
        o.setFoods(List.of(food));
        OrderDto saved = orderService.createOrder(o);

        // Manually mark it fulfilled in DB first
        var entity = orderRepository.findById(saved.getId()).get();
        entity.setIsFulfilled(true);
        orderRepository.save(entity);

        mvc.perform(post("/api/orders/fulfillOrder")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestUtils.asJsonString(saved)))
            .andExpect(status().isGone()); // 410
    }

    
    @Test
    @Transactional
    @WithMockUser(username = "staff", roles = "STAFF")
    void testFulfillOrder_BadRequest() throws Exception {
        Food food = foodRepository.findAll().get(0);
        // Create order with stock available
        OrderDto o = new OrderDto(0L, "FailOrder");
        o.setFoods(List.of(food));
        OrderDto saved = orderService.createOrder(o);

        // Now reduce stock to 0 (simulating stock depletion)
        food.setAmount(0);
        foodRepository.save(food);
        inventoryService.updateInventory(new InventoryDto(1L, List.of(food)));

        mvc.perform(post("/api/orders/fulfillOrder")
                .contentType(MediaType.APPLICATION_JSON)
                .content(TestUtils.asJsonString(saved)))
            .andExpect(status().isBadRequest()); // 400
    }

    @Test
    @Transactional
    @WithMockUser(username = "customer", roles = "CUSTOMER")
    void testGetOrder_NotFound() throws Exception {
        mvc.perform(get("/api/orders/999"))
           .andExpect(status().isNotFound());
    }

    @Test
    @Transactional
    void testGetMyOrders_Unauthorized() throws Exception {
        mvc.perform(get("/api/orders/my-orders"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @Transactional
    void testGetMyFulfilledOrders_Unauthorized() throws Exception {
        mvc.perform(get("/api/orders/my-orders/fulfilled"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @Transactional
    void testGetMyUnfulfilledOrders_Unauthorized() throws Exception {
        mvc.perform(get("/api/orders/my-orders/unfulfilled"))
            .andExpect(status().isUnauthorized());
    }
    
    @Test
    @Transactional
    @WithMockUser(username = "customer", roles = "CUSTOMER")
    void testGetMyOrders_Success() throws Exception {
        // Create an order for the customer user
        Food food = foodRepository.findAll().get(0);

        OrderDto orderDto = new OrderDto(0L, "MyOrderTest");
        orderDto.setFoods(new ArrayList<>(List.of(food)));
        orderService.createOrder(orderDto);

        mvc.perform(get("/api/orders/my-orders"))
            .andExpect(status().isOk());
    }

    
    @Test
    @Transactional
    @WithMockUser(username = "customer", roles = "CUSTOMER")
    void testGetMyFulfilledOrders_Success() throws Exception {
        // Create order
        Food food = foodRepository.findAll().get(0);

        OrderDto orderDto = new OrderDto(0L, "FulfilledOrderTest");
        orderDto.setFoods(new ArrayList<>(List.of(food)));
        OrderDto savedOrder = orderService.createOrder(orderDto);

        // Mark fulfilled
        var entity = orderRepository.findById(savedOrder.getId()).get();
        entity.setIsFulfilled(true);
        orderRepository.save(entity);

        mvc.perform(get("/api/orders/my-orders/fulfilled"))
            .andExpect(status().isOk());
    }

    
    @Test
    @Transactional
    @WithMockUser(username = "customer", roles = "CUSTOMER")
    void testGetMyUnfulfilledOrders_Success() throws Exception {
        // Create order (not fulfilled)
        Food food = foodRepository.findAll().get(0);

        OrderDto orderDto = new OrderDto(0L, "UnfulfilledOrderTest");
        orderDto.setFoods(new ArrayList<>(List.of(food)));
        orderService.createOrder(orderDto);

        mvc.perform(get("/api/orders/my-orders/unfulfilled"))
            .andExpect(status().isOk());
    }
}
