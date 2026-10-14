package br.com.coffeemail.workbench.runner.dto;

import java.util.List;
import org.jspecify.annotations.Nullable;

/** Cadastro de webhook. */
public record CreateWebhookRequest(@Nullable String url, @Nullable List<String> events) {}
