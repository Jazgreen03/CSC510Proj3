package FoodSeer.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO for chat request to Ollama.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequestDto {
    /** The message to send to the AI */
    private String message;
    /** Optional: whether the client prefers the response to be spoken */
    private Boolean speak;

    /** Mode can be 'guided', 'freeform', or 'recommend' */
    private String mode;

    /** Conversation history (optional) - list of role/content pairs */
    private java.util.List<MessageDto> history;

    /** Optional user id to build personalized prompts */
    private Long userId;

    // Convenience constructor to preserve existing call sites that pass only the message
    public ChatRequestDto(String message, Boolean speak) {
        this.message = message;
        this.speak = speak;
        this.mode = null;
        this.history = null;
        this.userId = null;
    }
}

