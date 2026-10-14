package br.com.coffeemail.workbench.runner.dto;

import org.jspecify.annotations.Nullable;

/** Cadastro de template. */
public record CreateTemplateRequest(@Nullable String name, @Nullable String subject, @Nullable String html, @Nullable String format) {}
