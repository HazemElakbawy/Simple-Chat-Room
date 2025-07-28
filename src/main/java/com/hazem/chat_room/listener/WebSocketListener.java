package com.hazem.chat_room.listener;

import com.hazem.chat_room.model.MessageType;
import com.hazem.chat_room.model.ServerMessage;
import com.hazem.chat_room.util.UserUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Objects;
import java.util.Optional;

import static com.hazem.chat_room.util.UserUtils.activeUsers;


@Component
public class WebSocketListener {

  private static final Logger LOGGER = LoggerFactory.getLogger(WebSocketListener.class.getName());
  private final SimpMessagingTemplate template;
  private final UserUtils userUtils;

  public WebSocketListener(SimpMessagingTemplate template, UserUtils userUtils) {
    this.template = template;
    this.userUtils = userUtils;
  }

  @EventListener
  public void handleWebSocketConnect(SessionConnectedEvent event) {
    StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());

    String sessionId = Optional.ofNullable(headerAccessor.getSessionId())
        .orElseThrow(() -> new RuntimeException("Session id value is null"));

    LOGGER.info("A new websocket connection established, session id: {}", sessionId);
    userUtils.publishUsersCount();
  }

  @EventListener
  public void handleWebSocketDisconnect(SessionDisconnectEvent event) {
    StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
    String sessionId = headerAccessor.getSessionId();

    String username = Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("username").toString();

    if (username != null & sessionId != null) {
      LOGGER.info("{} has disconnected", username);
      activeUsers.remove(sessionId);
      userUtils.publishUsersCount();
    }

    ServerMessage leaveMessage = new ServerMessage(
        "System",
        String.format("%s left the chat", username),
        MessageType.SYSTEM, sessionId, false
    );

    template.convertAndSend("/topic/public", leaveMessage);
    userUtils.removeUser(sessionId);
    userUtils.publishUsersCount();
  }
}
