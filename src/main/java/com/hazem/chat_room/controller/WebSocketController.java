package com.hazem.chat_room.controller;

import com.hazem.chat_room.model.ClientMessage;
import com.hazem.chat_room.model.MessageType;
import com.hazem.chat_room.model.ServerMessage;
import com.hazem.chat_room.util.UserUtils;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Objects;

@Controller
public class WebSocketController {

  /*
   * Connect to WebSocket
   * Join Chat
   * Disconnect
   * Send Public Message
   * Send Private Message
   * Send Typing Indicator
   * */

  private static final Logger LOGGER = LoggerFactory.getLogger(WebSocketController.class);
  private final SimpMessagingTemplate template;
  private final UserUtils userUtils;

  public WebSocketController(SimpMessagingTemplate template, UserUtils userUtils) {
    this.template = template;
    this.userUtils = userUtils;
  }

  @MessageMapping("/chat.sendMessage")
  @SendTo("/topic/public")
  public ServerMessage sendMessageToChat(@Payload @Valid ClientMessage clientMessage) {

    if (clientMessage.isCommand() && clientMessage.getCommand().equals("announce")) {
      LOGGER.info("Client announced this message to all users: {}", clientMessage.content());

      return new ServerMessage(
          "System",
          "📢 " + clientMessage.getCommandsArgs(),
          MessageType.SYSTEM,
          null,
          true
      );
    }

    ServerMessage serverMessage = ServerMessage.fromClientMessage(clientMessage);
    LOGGER.info("Received message: {}", clientMessage);
    return serverMessage;
  }

  @MessageMapping("/chat.addUser")
  @SendTo("/topic/public")
  public ServerMessage addUserToChat(
      @Payload @Valid ClientMessage clientMessage,
      SimpMessageHeaderAccessor headerAccessor) {

    Objects.requireNonNull(headerAccessor.getSessionAttributes()).put("username", clientMessage.sender());

    userUtils.addUser(headerAccessor.getSessionId(), clientMessage.sender());
    userUtils.publishUsersCount();

    return new ServerMessage(
        clientMessage.sender(),
        String.format("🆕 %s has joined the chat", clientMessage.sender()),
        MessageType.JOIN,
        null,
        true
    );
  }

  @MessageMapping("/chat.sendPrivate")
  public void sendPrivateMessage(
      @Payload @Valid ClientMessage clientMessage,
      SimpMessageHeaderAccessor headerAccessor) {

    String senderUser = Objects.requireNonNull(headerAccessor.getSessionAttributes())
        .get("username")
        .toString();

    LOGGER.info("Private message from {} to {}", senderUser, clientMessage.sender());

    ServerMessage message = new ServerMessage(
        clientMessage.sender(),
        clientMessage.content(),
        MessageType.PRIVATE,
        null,
        true);

    template.convertAndSendToUser(
        clientMessage.sender(),
        "/queue/private",
        message
    );
  }

  @MessageMapping(value = "/chat.typing")
  @SendTo("/topic/typing")
  public ServerMessage sendTypingMessage(@Payload @Valid ClientMessage clientMessage) {
    return ServerMessage.fromClientMessage(clientMessage);
  }


}
