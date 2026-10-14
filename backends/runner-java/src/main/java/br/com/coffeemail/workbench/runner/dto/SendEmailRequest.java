package br.com.coffeemail.workbench.runner.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import org.jspecify.annotations.Nullable;

/** Envio de e-mail pela UI; {@code to} aceita texto ou lista. */
public record SendEmailRequest(@Nullable String from, @Nullable JsonNode to, @Nullable String subject, @Nullable String html, @Nullable String text, @Nullable String replyTo, @Nullable List<EmailTagDto> tags) {}
