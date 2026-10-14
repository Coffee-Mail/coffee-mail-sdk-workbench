package br.com.coffeemail.workbench.runner.dto;

import org.jspecify.annotations.Nullable;

/** Cadastro de audiência. */
public record CreateAudienceRequest(@Nullable String name, @Nullable String description) {}
