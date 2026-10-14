package br.com.coffeemail.workbench.runner.dto;

/** Informações do runner exibidas pela UI. */
public record RunnerInfo(String language, String runtime, String sdkVersion, String status) {}
