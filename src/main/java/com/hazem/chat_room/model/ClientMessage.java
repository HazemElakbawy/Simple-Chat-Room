package com.hazem.chat_room.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public record ClientMessage(
    @NotBlank
    String sender,

    @NotBlank
    String content,

    @NotBlank
    MessageType type,

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    String timestamp) {

  public ClientMessage {
    if (timestamp == null) {
      String pattern = "yyyy-MM-dd HH:mm:ss";
      DateTimeFormatter formatter = DateTimeFormatter.ofPattern(pattern);
      timestamp = LocalDateTime.now().format(formatter);
    }
  }

  public String getCommand() {
    String commandWithSlash = content.split(" ", 2)[0];
    return commandWithSlash.substring(1);
  }

  public boolean isCommand() {
    return content.startsWith("/");
  }

  public String getCommandsArgs() {
    return content.split(" ", 2)[1];
  }
}
