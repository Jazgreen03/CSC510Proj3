package FoodSeer.controller;

// ...existing code...
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// ...existing code...
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
// ...existing code...
import org.springframework.boot.test.context.SpringBootTest;
// ...existing code...
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;

import com.fasterxml.jackson.databind.ObjectMapper;

import FoodSeer.config.Roles;
import FoodSeer.config.Roles.UserRoles;
import FoodSeer.dto.RegisterRequestDto;
import FoodSeer.dto.UpdateRoleDto;
import FoodSeer.dto.UserDto;
import FoodSeer.dto.UserPreferencesDto;
import FoodSeer.entity.User;
import FoodSeer.repositories.ConversationRepository;
import FoodSeer.repositories.OrderRepository;
import FoodSeer.repositories.UserRepository;
import FoodSeer.service.AuthService;
import FoodSeer.service.UserService;
import jakarta.transaction.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserService userService;

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    private User testUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        authService.register(new RegisterRequestDto("testuser", "test@example.com", "password123"));
        authService.register(new RegisterRequestDto("admin", "admin@example.com", "adminpass"));
        userService.updateUserRole(userService.getByUsername("admin").getId(), "ROLE_ADMIN");

        // Reload persisted users with their database-generated IDs
        testUser = userService.getByUsername("testuser");
        adminUser = userService.getByUsername("admin");
    }

    @AfterEach
    void cleanUp() {
        // Delete in proper order to avoid foreign key constraint violations
        conversationRepository.deleteAll();
        orderRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldListAllUsers() throws Exception {
        mockMvc.perform(get("/api/users")
            .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[*].username", hasItem(testUser.getUsername())))
            .andExpect(jsonPath("$[*].username", hasItem(adminUser.getUsername())))
            .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    @WithMockUser(roles = "STANDARD")
    void shouldNotAllowNonAdminToListUsers() throws Exception {
        mockMvc.perform(get("/api/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldGetUserById() throws Exception {
    // Test for testUser
    mockMvc.perform(get("/api/users/" + testUser.getId())
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value(testUser.getUsername()));

    // Test for adminUser
    mockMvc.perform(get("/api/users/" + adminUser.getId())
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value(adminUser.getUsername()));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldReturn404WhenUserNotFound() throws Exception {

        mockMvc.perform(get("/api/users/99")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldUpdateUserRole() throws Exception {
        mockMvc.perform(put("/api/users/" + testUser.getId() + "/role")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new UpdateRoleDto(Roles.ROLE_ADMIN))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value(Roles.ROLE_ADMIN));
    }

    @Test
    @WithMockUser(username = "testuser", authorities = "ROLE_CUSTOMER")
    void shouldNotAllowNonAdminToUpdateRole() throws Exception {
        mockMvc.perform(put("/api/users/" + testUser.getId() + "/role")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new UpdateRoleDto(Roles.ROLE_ADMIN))))
                .andExpect(status().isForbidden());
    }
    
    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldDeleteUserWhenAdmin() throws Exception {
        mockMvc.perform(delete("/api/users/" + testUser.getId()))
        .andExpect(status().isOk());

        // Ensure user is removed
        mockMvc.perform(get("/api/users/" + testUser.getId()))
                .andExpect(status().isNotFound());
    }
    
    @Test
    @WithMockUser(roles = "STANDARD")
    void shouldNotAllowNonAdminToDeleteUser() throws Exception {
        mockMvc.perform(delete("/api/users/" + testUser.getId()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "testuser")
    void shouldUpdateUserPreferences() throws Exception {
        UserPreferencesDto prefs = new UserPreferencesDto("LOW", "VEGAN");

        mockMvc.perform(put("/api/users/me/preferences")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(prefs)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.costPreference").value("LOW"))
                .andExpect(jsonPath("$.dietaryRestrictions").value("VEGAN"));
    }

    @Test
    void shouldRejectUnauthenticatedUpdatePreferences() throws Exception {
        UserPreferencesDto prefs = new UserPreferencesDto("LOW", "VEGAN");

        mockMvc.perform(put("/api/users/preferences")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(prefs)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "testuser")
    void shouldReturnCurrentUser() throws Exception {
        mockMvc.perform(get("/api/users/me")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void shouldRejectUnauthenticatedGetCurrentUser() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "ghostuser")
    void shouldReturn404WhenUpdatingPreferencesForMissingUser() throws Exception {
        UserPreferencesDto prefs = new UserPreferencesDto("LOW", "VEGAN");

        mockMvc.perform(put("/api/users/me/preferences")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(prefs)))
                .andExpect(status().isNotFound());
    }

}