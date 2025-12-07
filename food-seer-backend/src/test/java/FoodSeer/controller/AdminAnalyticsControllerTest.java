package FoodSeer.controller;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Arrays;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import FoodSeer.entity.Food;
import FoodSeer.entity.Order;
import FoodSeer.entity.User;
import FoodSeer.repositories.FoodRepository;
import FoodSeer.repositories.OrderRepository;
import FoodSeer.repositories.UserRepository;
import FoodSeer.repositories.InventoryRepository;

/**
 * Tests for admin analytics endpoints.
 * Creates data directly via repositories and verifies JSON responses from the controller.
 */
@SpringBootTest
@AutoConfigureMockMvc
public class AdminAnalyticsControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @BeforeEach
    public void setUp() {
        orderRepository.deleteAll();
        userRepository.deleteAll();
        foodRepository.deleteAll();
        inventoryRepository.deleteAll();
    }

    // Helper creators
    private Food createFood(String name, int price) {
        Food f = new Food(name, 10, price, Arrays.asList());
        return foodRepository.save(f);
    }

    private User createUser(String username) {
        User u = User.builder().username(username).email(username + "@local").password("p").role("ROLE_CUSTOMER").build();
        return userRepository.save(u);
    }

    private Order createOrder(User user, Food... foods) {
        Order o = new Order();
        o.setName("Order for " + user.getUsername());
        o.setUser(user);
        o.setFoods(Arrays.asList(foods));
        o.setIsFulfilled(true);
        o.setCreatedAt(LocalDateTime.now(ZoneId.systemDefault()));
        return orderRepository.save(o);
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void overviewEmpty() throws Exception {
        mvc.perform(get("/api/admin/analytics/overview")).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOrders").value(0))
                .andExpect(jsonPath("$.totalRevenue").value(0))
                .andExpect(jsonPath("$.avgOrderValue").value(0.0));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void overviewWithFulfilledAndUnfulfilled() throws Exception {
        User u = createUser("u1");
        Food f1 = createFood("A", 5);
        Food f2 = createFood("B", 10);

        Order o1 = createOrder(u, f1); // fulfilled
        Order o2 = new Order(); // unfulfilled
        o2.setName("un"); o2.setUser(u); o2.setFoods(Arrays.asList(f2)); o2.setIsFulfilled(false);
        o2.setCreatedAt(LocalDateTime.now(ZoneId.systemDefault()));
        orderRepository.save(o2);

        mvc.perform(get("/api/admin/analytics/overview")).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOrders").value(2))
                .andExpect(jsonPath("$.fulfilledOrders").value(1))
                .andExpect(jsonPath("$.unfulfilledOrders").value(1))
                .andExpect(jsonPath("$.totalRevenue").value(5))
                .andExpect(jsonPath("$.avgOrderValue", is(closeTo(5.0, 0.01))));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void ordersPerDayDefaultDays() throws Exception {
        User u = createUser("u1");
        Food f = createFood("X", 3);
        // create 3 orders today
        createOrder(u, f); createOrder(u, f); createOrder(u, f);

        mvc.perform(get("/api/admin/analytics/orders-per-day")).andExpect(status().isOk())
                .andExpect(jsonPath("$.*", hasSize(30)))
                .andExpect(jsonPath("$..*", notNullValue()));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void ordersPerDayCustomDays() throws Exception {
        User u = createUser("u2");
        Food f = createFood("Y", 4);
        // create one order
        createOrder(u, f);

        mvc.perform(get("/api/admin/analytics/orders-per-day?days=7")).andExpect(status().isOk())
                .andExpect(jsonPath("$.*", hasSize(7)));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void topProductsDefaultLimit() throws Exception {
        User u = createUser("tp1");
        Food a = createFood("FOO", 2);
        Food b = createFood("BAR", 3);
        // FOO:2 orders, BAR:1
        createOrder(u, a); createOrder(u, a); createOrder(u, b);

        mvc.perform(get("/api/admin/analytics/top-products")).andExpect(status().isOk())
                .andExpect(jsonPath("$.FOO").value(2))
                .andExpect(jsonPath("$.BAR").value(1));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void topProductsWithLimit2() throws Exception {
        User u = createUser("tp2");
        Food a = createFood("P1", 1);
        Food b = createFood("P2", 1);
        Food c = createFood("P3", 1);
        createOrder(u, a); createOrder(u, b); createOrder(u, c); createOrder(u, a);

        mvc.perform(get("/api/admin/analytics/top-products?limit=2")).andExpect(status().isOk())
                .andExpect(jsonPath("$.*", hasSize(2)));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void preferencesDistributionEmpty() throws Exception {
        mvc.perform(get("/api/admin/analytics/preferences")).andExpect(status().isOk())
                .andExpect(jsonPath("$.costPreference").isMap())
                .andExpect(jsonPath("$.dietaryRestrictions").isMap());
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void preferencesDistributionWithValues() throws Exception {
        User u1 = createUser("p1"); u1.setCostPreference("LOW"); u1.setDietaryRestrictions("VEGAN"); userRepository.save(u1);
        User u2 = createUser("p2"); u2.setCostPreference("HIGH"); u2.setDietaryRestrictions(""); userRepository.save(u2);

        mvc.perform(get("/api/admin/analytics/preferences")).andExpect(status().isOk())
                .andExpect(jsonPath("$.costPreference.LOW").value(1))
                .andExpect(jsonPath("$.costPreference.HIGH").value(1))
                .andExpect(jsonPath("$.dietaryRestrictions.VEGAN").value(1))
                .andExpect(jsonPath("$.dietaryRestrictions.UNSET").value(1));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void engagementEmpty() throws Exception {
        mvc.perform(get("/api/admin/analytics/engagement")).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRecentOrders").value(0))
                .andExpect(jsonPath("$.activeUsers").value(0));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void engagementWithUsersOrders() throws Exception {
        User u1 = createUser("eu1"); User u2 = createUser("eu2");
        Food f = createFood("EF", 6);
        // u1:2 orders, u2:1 order
        createOrder(u1, f); createOrder(u1, f); createOrder(u2, f);

        mvc.perform(get("/api/admin/analytics/engagement")).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRecentOrders").value(3))
                .andExpect(jsonPath("$.activeUsers").value(2))
                .andExpect(jsonPath("$.topCustomers.*", hasSize(2)));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void snapshotContainsKeys() throws Exception {
        mvc.perform(get("/api/admin/analytics/snapshot")).andExpect(status().isOk())
                .andExpect(jsonPath("$.overview").exists())
                .andExpect(jsonPath("$.ordersPerDay").exists())
                .andExpect(jsonPath("$.topProducts").exists())
                .andExpect(jsonPath("$.preferences").exists())
                .andExpect(jsonPath("$.engagement").exists());
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void ordersPerDayCountsCorrect() throws Exception {
        User u = createUser("op1"); Food f = createFood("OP", 2);
        Order o = createOrder(u, f);
        // ensure one of the days has count 1
        mvc.perform(get("/api/admin/analytics/orders-per-day?days=3")).andExpect(status().isOk())
                .andExpect(jsonPath("$.*", hasSize(3)))
                .andExpect(jsonPath("$..*", notNullValue()));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void topProductsOrdering() throws Exception {
        User u = createUser("tpord");
        Food a = createFood("AAA", 1); Food b = createFood("BBB", 1);
        createOrder(u, a); createOrder(u, a); createOrder(u, b);

        mvc.perform(get("/api/admin/analytics/top-products")).andExpect(status().isOk())
                .andExpect(jsonPath("$.AAA").value(2))
                .andExpect(jsonPath("$.BBB").value(1));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void engagementAvgOrdersPerActiveUser() throws Exception {
        User u1 = createUser("ea1"); User u2 = createUser("ea2");
        Food f = createFood("E1", 2);
        createOrder(u1, f); createOrder(u1, f); createOrder(u2, f);

        mvc.perform(get("/api/admin/analytics/engagement")).andExpect(status().isOk())
                .andExpect(jsonPath("$.avgOrdersPerActiveUser", is(closeTo(1.5, 0.01))));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void preferencesDietaryUnsetCounts() throws Exception {
        User u = createUser("prefu"); u.setDietaryRestrictions(null); userRepository.save(u);
        mvc.perform(get("/api/admin/analytics/preferences")).andExpect(status().isOk())
                .andExpect(jsonPath("$.dietaryRestrictions.UNSET").value(1));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void snapshotDaysParam() throws Exception {
        mvc.perform(get("/api/admin/analytics/snapshot?days=7")).andExpect(status().isOk())
                .andExpect(jsonPath("$.ordersPerDay").exists());
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void topProductsLimitExceeds() throws Exception {
        User u = createUser("tpe" );
        Food a = createFood("L1",1); createOrder(u,a);
        mvc.perform(get("/api/admin/analytics/top-products?limit=100")).andExpect(status().isOk())
                .andExpect(jsonPath("$.*", not(empty())));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void ordersPerDayEdgeDateFiltering() throws Exception {
        User u = createUser("edge"); Food f = createFood("EDGE",1);
        Order o = new Order(); o.setName("old"); o.setUser(u); o.setFoods(Arrays.asList(f)); o.setIsFulfilled(true);
        o.setCreatedAt(LocalDateTime.now(ZoneId.systemDefault()).minusDays(40));
        orderRepository.save(o);

        mvc.perform(get("/api/admin/analytics/orders-per-day?days=30")).andExpect(status().isOk())
                .andExpect(jsonPath("$.*", hasSize(30)));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void engagementTopCustomersLimit() throws Exception {
        User u = createUser("topc"); Food f = createFood("TC",1);
        for (int i=0;i<12;i++) createOrder(u,f);
        mvc.perform(get("/api/admin/analytics/engagement")).andExpect(status().isOk())
                .andExpect(jsonPath("$.topCustomers.*", hasSize(1)));
    }

    @Test
    @Transactional
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    void overviewAvgOrderValueZeroWhenNoFulfilled() throws Exception {
        User u = createUser("nof"); Food f = createFood("NF",1);
        Order o = new Order(); o.setName("u"); o.setUser(u); o.setFoods(Arrays.asList(f)); o.setIsFulfilled(false);
        o.setCreatedAt(LocalDateTime.now(ZoneId.systemDefault())); orderRepository.save(o);

        mvc.perform(get("/api/admin/analytics/overview")).andExpect(status().isOk())
                .andExpect(jsonPath("$.avgOrderValue").value(0.0));
    }

}
