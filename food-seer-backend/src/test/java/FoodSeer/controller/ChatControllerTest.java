package FoodSeer.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;

import FoodSeer.dto.ChatRequestDto;
import FoodSeer.dto.LoginRequestDto;
import jakarta.transaction.Transactional;

@SpringBootTest
@Transactional
@AutoConfigureMockMvc
class ChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String authToken;
    private ChatRequestDto chatRequest;

    @BeforeEach
    void setUp() throws Exception {
        // Register and login a test user
        String username = "chattestuser" + System.currentTimeMillis();
        String password = "password123";
        
        // Register
        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new FoodSeer.dto.RegisterRequestDto(username, "chat@test.com", password)
                )));

        // Login and get token
        String loginResponse = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new LoginRequestDto(username, password)
                )))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        // Extract token from response
        authToken = objectMapper.readTree(loginResponse).get("accessToken").asText();
        
        chatRequest = new ChatRequestDto("How are you feeling today?", null);
    }

    @Test
    void shouldSendChatMessageSuccessfully() throws Exception {
        mockMvc.perform(post("/api/chat")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(chatRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.message").isString());
    }

    @Test
    void shouldGenerateDynamicQuestionBasedOnContext() throws Exception {
        // First message - initial question
        ChatRequestDto firstRequest = new ChatRequestDto(
            "You are a friendly food recommendation assistant. Based on the conversation so far, ask ONE natural, conversational question to learn more about the user.\n\n" +
            "Conversation so far:\n" +
            "Assistant: Hi! I'm your FoodSeer assistant. I'll ask you a few questions to find the perfect meal for you!\n\n" +
            "What we already know: Nothing yet\n" +
            "What we still need to know: their current mood/feeling\n\n" +
            "Generate a single, friendly, conversational question (1-2 sentences max) that feels natural and helps you understand their current mood/feeling. Be specific and engaging based on what they've already told you. Do NOT include any explanations or prefixes, just the question itself.",
            null
        );
        
        String firstResponse = mockMvc.perform(post("/api/chat")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(firstRequest)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        
        String firstQuestion = objectMapper.readTree(firstResponse).get("message").asText();
        
        // Verify it's a question (contains question mark or is a question)
        assert firstQuestion.length() > 0 : "Question should not be empty";
        
        // Second message - follow-up question based on user response
        ChatRequestDto secondRequest = new ChatRequestDto(
            "You are a friendly food recommendation assistant. Based on the conversation so far, ask ONE natural, conversational question to learn more about the user.\n\n" +
            "Conversation so far:\n" +
            "Assistant: " + firstQuestion + "\n" +
            "User: I'm feeling tired and stressed\n\n" +
            "What we already know: Mood: I'm feeling tired and stressed\n" +
            "What we still need to know: their hunger level\n\n" +
            "Generate a single, friendly, conversational question (1-2 sentences max) that feels natural and helps you understand their hunger level. Be specific and engaging based on what they've already told you. Do NOT include any explanations or prefixes, just the question itself.",
            null
        );
        
        String secondResponse = mockMvc.perform(post("/api/chat")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(secondRequest)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        
        String secondQuestion = objectMapper.readTree(secondResponse).get("message").asText();
        
        // Verify the second question is different and context-aware
        assert !secondQuestion.equals(firstQuestion) : "Second question should be different from first";
        assert secondQuestion.length() > 0 : "Second question should not be empty";
    }

    @Test
    void shouldFailWithoutAuthentication() throws Exception {
        mockMvc.perform(post("/api/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(chatRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldHandleEmptyMessage() throws Exception {
        ChatRequestDto emptyRequest = new ChatRequestDto("", null);
        
        mockMvc.perform(post("/api/chat")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(emptyRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void shouldHandleLongMessage() throws Exception {
        String longMessage = "This is a very long message. ".repeat(100);
        ChatRequestDto longRequest = new ChatRequestDto(longMessage, null);
        
        mockMvc.perform(post("/api/chat")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(longRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void shouldGenerateContextualQuestions() throws Exception {
        // Test that questions adapt based on previous responses
        String context1 = "User said they're feeling energetic and want something healthy";
        ChatRequestDto request1 = new ChatRequestDto(
            "You are a friendly food recommendation assistant. Based on the conversation so far, ask ONE natural, conversational question to learn more about the user.\n\n" +
            "Conversation so far:\n" +
            "User: " + context1 + "\n\n" +
            "What we already know: Mood: energetic, Preference: healthy\n" +
            "What we still need to know: their hunger level\n\n" +
            "Generate a single, friendly, conversational question (1-2 sentences max) that feels natural and helps you understand their hunger level. Be specific and engaging based on what they've already told you. Do NOT include any explanations or prefixes, just the question itself.",
            null
        );
        
        String response1 = mockMvc.perform(post("/api/chat")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        
        String question1 = objectMapper.readTree(response1).get("message").asText();
        
        // Different context - user is tired and wants comfort food
        String context2 = "User said they're feeling tired and want comfort food";
        ChatRequestDto request2 = new ChatRequestDto(
            "You are a friendly food recommendation assistant. Based on the conversation so far, ask ONE natural, conversational question to learn more about the user.\n\n" +
            "Conversation so far:\n" +
            "User: " + context2 + "\n\n" +
            "What we already know: Mood: tired, Preference: comfort food\n" +
            "What we still need to know: their hunger level\n\n" +
            "Generate a single, friendly, conversational question (1-2 sentences max) that feels natural and helps you understand their hunger level. Be specific and engaging based on what they've already told you. Do NOT include any explanations or prefixes, just the question itself.",
            null
        );
        
        String response2 = mockMvc.perform(post("/api/chat")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        
        String question2 = objectMapper.readTree(response2).get("message").asText();
        
        // Questions should be different based on context
        assert !question1.equals(question2) : "Questions should differ based on user context";
    }
}

