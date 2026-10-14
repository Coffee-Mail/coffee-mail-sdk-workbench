package br.com.coffeemail.workbench.runner.dto;

import java.util.List;

/** Resumo de e-mail. */
public record EmailRecord(String id, String from, List<String> to, String subject, String status, String createdAt) {}
