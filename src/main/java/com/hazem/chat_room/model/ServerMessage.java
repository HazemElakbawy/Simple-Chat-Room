package com.hazem.chat_room.model;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

public record ServerMessage(
    String sender,
    String content,
    MessageType type,
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    LocalDateTime timestamp,
    String sessionId,
    boolean processed) {

  public ServerMessage(String sender, String content, MessageType type, String sessionId, boolean processed) {
    this(sender, content, type, LocalDateTime.now(), sessionId, processed);
  }

  public static ServerMessage fromClientMessage(ClientMessage message) {
    return new ServerMessage(
        message.sender(),
        message.content(),
        message.type(),
        LocalDateTime.now(),
        null,
        true
    );
  }

  public static ServerMessage fromClientMessage(ClientMessage message, String sessionId) {
    return new ServerMessage(
        message.sender(),
        message.content(),
        message.type(),
        LocalDateTime.now(),
        sessionId,
        true
    );
  }

  public ServerMessage withContent(String newContent) {
    return new ServerMessage(newContent, sender, type, timestamp, sessionId, processed);
  }

  public ServerMessage withType(MessageType newType) {
    return new ServerMessage(content, sender, newType, timestamp, sessionId, processed);
  }

  public ServerMessage withSessionId(String newSessionId) {
    return new ServerMessage(content, sender, type, timestamp, newSessionId, processed);
  }
}
