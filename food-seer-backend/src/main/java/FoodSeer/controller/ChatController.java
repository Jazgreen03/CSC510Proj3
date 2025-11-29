package FoodSeer.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import FoodSeer.dto.ChatRequestDto;
import FoodSeer.dto.ChatResponseDto;
import FoodSeer.dto.ConversationDto;
import FoodSeer.service.ChatService;
import FoodSeer.service.ConversationService;
import java.util.List;

/**
 * Controller for AI chat functionality.
 * Provides endpoint for communicating with Ollama AI.
 */
@CrossOrigin("*")
@RestController
@RequestMapping("/api/chat")
public class ChatController {
    
    /** Connection to ChatService */
    @Autowired
    private ChatService chatService;

    /** Connection to ConversationService */
    @Autowired
    private ConversationService conversationService;
    
    /**
     * Sends a message to the AI and returns the response.
     *
     * @param chatRequest the chat request containing the user's message
     * @return ResponseEntity containing the AI's response
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CUSTOMER')")
    @PostMapping
    public ResponseEntity<ChatResponseDto> sendMessage(@RequestBody final ChatRequestDto chatRequest) {
        final ChatResponseDto response = chatService.sendMessage(chatRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves conversation history for the authenticated user.
     *
     * @param userId the user ID
     * @return ResponseEntity containing the list of messages
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CUSTOMER')")
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<ConversationDto>> getConversationHistory(@PathVariable final Long userId) {
        final List<ConversationDto> history = conversationService.getUserConversationHistory(userId);
        return ResponseEntity.ok(history);
    }

    /**
     * Clears conversation history for the authenticated user.
     *
     * @param userId the user ID
     * @return ResponseEntity indicating success
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'CUSTOMER')")
    @DeleteMapping("/history/{userId}")
    public ResponseEntity<String> clearConversationHistory(@PathVariable final Long userId) {
        conversationService.clearUserConversationHistory(userId);
        return ResponseEntity.ok("Conversation history cleared.");
    }
}

