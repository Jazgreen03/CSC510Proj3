package FoodSeer.service.impl;

import FoodSeer.dto.ConversationDto;
import FoodSeer.entity.Conversation;
import FoodSeer.entity.Conversation.MessageRole;
import FoodSeer.entity.User;
import FoodSeer.repositories.ConversationRepository;
import FoodSeer.repositories.UserRepository;
import FoodSeer.service.ConversationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ConversationServiceImpl implements ConversationService {

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private UserRepository userRepository;

    @Override
    public void saveMessage(User user, String messageContent, String role) {
        if (user == null || messageContent == null || messageContent.trim().isEmpty()) {
            return;
        }

        Conversation conversation = new Conversation();
        conversation.setUser(user);
        conversation.setMessageContent(messageContent);
        
        try {
            conversation.setRole(MessageRole.valueOf(role.toUpperCase()));
        } catch (IllegalArgumentException e) {
            conversation.setRole(MessageRole.ASSISTANT);
        }

        conversationRepository.save(conversation);
    }

    @Override
    public List<ConversationDto> getUserConversationHistory(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return List.of();
        }

        return conversationRepository.findByUserOrderByCreatedAtAsc(user)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public void clearUserConversationHistory(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            List<Conversation> conversations = conversationRepository.findByUserOrderByCreatedAtAsc(user);
            conversationRepository.deleteAll(conversations);
        }
    }

    private ConversationDto mapToDto(Conversation conversation) {
        return new ConversationDto(
                conversation.getId(),
                conversation.getMessageContent(),
                conversation.getRole().toString().toLowerCase(),
                conversation.getCreatedAt()
        );
    }
}
