package com.hazem.chat_room.util;

import com.hazem.chat_room.model.MessageType;
import com.hazem.chat_room.model.ServerMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class UserUtils {

  public static final ConcurrentHashMap<String, String> activeUsers = new ConcurrentHashMap<>();
  private static final Logger LOGGER = LoggerFactory.getLogger(UserUtils.class);
  private final SimpMessagingTemplate template;

  public UserUtils(SimpMessagingTemplate template) {
    this.template = template;
  }

  public void publishUsersCount() {
    ServerMessage countMessage = new ServerMessage(
        "System",
        String.valueOf(activeUsers.size()),
        MessageType.SYSTEM,
        null,
        true
    );

    LOGGER.info("users count: {}", activeUsers.size());
    template.convertAndSend("/topic/usercount", countMessage);
  }

  public void addUser(String sessionId, String username) {
    activeUsers.put(sessionId, username);
    LOGGER.info("A new user {} added to active users", username);
  }

  public void removeUser(String sessionId) {
    activeUsers.remove(sessionId);
    LOGGER.info("A user was removed from active users list");
  }
}
