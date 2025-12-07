package FoodSeer.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import FoodSeer.entity.User;
import jakarta.transaction.Transactional;
import FoodSeer.config.Roles.UserRoles;

@DataJpaTest
@Transactional
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class UserRepositoryTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private UserRepository userRepository;
    
    private int testCounter = 0;
    
    private User createTestUser(String suffix) {
        return User.builder()
                .username("testuser" + suffix)
                .email("test" + suffix + "@example.com")
                .password("password123")
                .role(UserRoles.ROLE_CUSTOMER.name())
                .build();
    }
    
    @Test
    void shouldSaveUser() {
        User testUser = createTestUser("1");
        User savedUser = userRepository.save(testUser);
        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getUsername()).isEqualTo(testUser.getUsername());
        assertThat(savedUser.getEmail()).isEqualTo(testUser.getEmail());
    }
    
    @Test
    void shouldFindUserByUsername() {
        User testUser = createTestUser("2");
        entityManager.persist(testUser);
        entityManager.flush();
        
        User found = userRepository.findByUsername(testUser.getUsername()).orElse(null);
        assertThat(found).isNotNull();
        assertThat(found.getUsername()).isEqualTo(testUser.getUsername());
        assertThat(found.getEmail()).isEqualTo(testUser.getEmail());
    }
    
    @Test
    void shouldReturnTrueWhenUsernameExists() {
        User testUser = createTestUser("3");
        entityManager.persist(testUser);
        entityManager.flush();
        
        boolean exists = userRepository.existsByUsername(testUser.getUsername());
        assertThat(exists).isTrue();
    }
    
    @Test
    void shouldReturnFalseWhenUsernameDoesNotExist() {
        boolean exists = userRepository.existsByUsername("nonexistent");
        assertThat(exists).isFalse();
    }
    
    @Test
    void shouldReturnTrueWhenEmailExists() {
        User testUser = createTestUser("4");
        entityManager.persist(testUser);
        entityManager.flush();
        
        boolean exists = userRepository.existsByEmail(testUser.getEmail());
        assertThat(exists).isTrue();
    }
    
    @Test
    void shouldReturnFalseWhenEmailDoesNotExist() {
        boolean exists = userRepository.existsByEmail("nonexistent@example.com");
        assertThat(exists).isFalse();
    }
}
