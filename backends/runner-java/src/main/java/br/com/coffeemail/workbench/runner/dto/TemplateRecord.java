package br.com.coffeemail.workbench.runner.dto;

import org.jspecify.annotations.Nullable;

/** Resumo de template. */
public record TemplateRecord(String id, String name, @Nullable String subject, String format, String createdAt) {}
