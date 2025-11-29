package FoodSeer.service;

import FoodSeer.dto.ConversationDto;
import FoodSeer.entity.User;
import java.util.List;

public interface ConversationService {
    void saveMessage(User user, String messageContent, String role);
    List<ConversationDto> getUserConversationHistory(Long userId);
    void clearUserConversationHistory(Long userId);
}
