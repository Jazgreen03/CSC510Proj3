package FoodSeer.service;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import FoodSeer.repositories.ConversationRepository;
import FoodSeer.repositories.FoodRepository;
import FoodSeer.repositories.OrderRepository;
import FoodSeer.repositories.RoleRepository;
import FoodSeer.repositories.UserRepository;
import FoodSeer.service.impl.DataInitializer;

@SpringBootTest
@Transactional
public class DataInitializerTest {

    @Autowired
    private DataInitializer dataInitializer;

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @BeforeEach
    public void setup() {
        // Delete in proper order to avoid foreign key constraint violations
        conversationRepository.deleteAll();
        orderRepository.deleteAll();
        foodRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();
    }

    @Test
    public void testAdminUserAndRolesCreated() {
        assertEquals(0, userRepository.count());
        assertEquals(0, roleRepository.count());

        dataInitializer.onApplicationReady();

        // roles should exist
        assertNotNull(roleRepository.findByName("ROLE_ADMIN"));
        assertNotNull(roleRepository.findByName("ROLE_CUSTOMER"));
        assertNotNull(roleRepository.findByName("ROLE_STAFF"));

        // admin user should be created
        assertTrue(userRepository.findByUsername("admin").isPresent());
    }

    @Test
    public void testAdminPasswordUpdatesIfAdminExists() {
        dataInitializer.onApplicationReady();

        String originalHash =
            userRepository.findByUsername("admin").get().getPassword();

        // Run initializer again — should update password
        dataInitializer.onApplicationReady();

        String updatedHash =
            userRepository.findByUsername("admin").get().getPassword();

        // password hashes should not match (updated)
        assertNotEquals(originalHash, updatedHash);
    }

    @Test
    public void testSampleFoodsCreatedWhenEmpty() {
        assertEquals(0, foodRepository.count());

        dataInitializer.onApplicationReady();

        assertTrue(foodRepository.count() > 0,
                "Expected sample foods to be seeded");
    }

    @Test
    public void testSampleFoodsNotDuplicatedOnSecondRun() {
        dataInitializer.onApplicationReady();
        long firstCount = foodRepository.count();

        dataInitializer.onApplicationReady();
        long secondCount = foodRepository.count();

        assertEquals(firstCount, secondCount,
                "Food seeding should NOT repeat");
    }
}
