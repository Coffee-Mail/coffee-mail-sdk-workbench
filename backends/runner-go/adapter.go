package main

import (
	"context"
	"net/http"
	"time"

	coffeemail "github.com/Coffee-Mail/coffee-mail-sdk-go"
)

func sendEmail(body sendEmailRequest, to []string) operation {
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		params := &coffeemail.SendEmailParams{
			From:    coffeemail.Address{Email: body.From},
			To:      mapItems(to, func(email string) coffeemail.Address { return coffeemail.Address{Email: email} }),
			Subject: body.Subject,
			HTML:    body.HTML,
			Text:    body.Text,
			Tags:    mapItems(body.Tags, func(tag tagRequest) coffeemail.Tag { return coffeemail.Tag(tag) }),
			ReplyTo: optionalAddress(body.ReplyTo),
		}
		sent, err := client.Emails.Send(ctx, params)
		if err != nil {
			return nil, err
		}
		return sendEmailResult{ID: sent.ID, Status: string(sent.Status), CreatedAt: timestamp(sent.QueuedAt)}, nil
	}
}

func optionalAddress(email string) *coffeemail.Address {
	if email == "" {
		return nil
	}
	return &coffeemail.Address{Email: email}
}

func listEmails(r *http.Request) operation {
	page, limit := page(r), limit(r)
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		res, err := client.Emails.List(ctx, &coffeemail.ListEmailsParams{Limit: limit})
		if err != nil {
			return nil, err
		}
		items := mapItems(res.Emails, toEmailRecord)
		return paginatedResult[emailRecord]{Items: items, Total: len(items), Page: page, Limit: limit, HasMore: res.NextCursor != nil}, nil
	}
}

func listDomains(_ *http.Request) operation {
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		res, err := client.Domains.List(ctx)
		if err != nil {
			return nil, err
		}
		return mapItems(res.Domains, func(domain coffeemail.Domain) domainRecord {
			return domainRecord{
				ID:           domain.ID,
				Name:         domain.Name,
				Status:       string(domain.Status),
				DKIMSelector: domain.DKIMSelector,
				CreatedAt:    timestamp(domain.CreatedAt),
			}
		}), nil
	}
}

func createDomain(body createDomainRequest) operation {
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		created, err := client.Domains.Create(ctx, body.Name)
		if err != nil {
			return nil, err
		}
		return domainRecord{
			ID:        created.ID,
			Name:      created.Name,
			Status:    string(created.Status),
			CreatedAt: timestamp(valueOr(created.CreatedAt, time.Now())),
		}, nil
	}
}

func verifyDomain(r *http.Request) operation {
	id := r.PathValue("id")
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		return client.Domains.Verify(ctx, id)
	}
}

func domainHealth(r *http.Request) operation {
	id := r.PathValue("id")
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		return client.Domains.GetHealth(ctx, id)
	}
}

func listTemplates(r *http.Request) operation {
	page, limit := page(r), limit(r)
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		res, err := client.Templates.List(ctx)
		if err != nil {
			return nil, err
		}
		items := mapItems(res.Data, toTemplateRecord)
		return paginatedResult[templateRecord]{Items: items, Total: len(items), Page: page, Limit: limit}, nil
	}
}

func createTemplate(body createTemplateRequest) operation {
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		created, err := client.Templates.Create(ctx, &coffeemail.CreateTemplateParams{
			Name:    body.Name,
			Subject: body.Subject,
			HTML:    body.HTML,
			Format:  templateFormats[body.Format],
		})
		if err != nil {
			return nil, err
		}
		return toTemplateRecord(*created), nil
	}
}

func previewTemplate(r *http.Request) operation {
	id := r.PathValue("id")
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		return client.Templates.PreviewByID(ctx, id, nil)
	}
}

func listAudiences(_ *http.Request) operation {
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		res, err := client.Audiences.List(ctx, nil)
		if err != nil {
			return nil, err
		}
		return mapItems(res.Audiences, toAudienceRecord), nil
	}
}

func createAudience(body createAudienceRequest) operation {
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		created, err := client.Audiences.Create(ctx, &coffeemail.CreateAudienceParams{Name: body.Name, Description: body.Description})
		if err != nil {
			return nil, err
		}
		record := toAudienceRecord(*created)
		record.TotalContacts = 0
		return record, nil
	}
}

func listContacts(r *http.Request) operation {
	audienceID, page, limit := r.PathValue("id"), page(r), limit(r)
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		res, err := client.Audiences.Contacts.List(ctx, audienceID, &coffeemail.OffsetParams{Limit: limit})
		if err != nil {
			return nil, err
		}
		items := mapItems(res.Contacts, toContactRecord)
		return paginatedResult[contactRecord]{Items: items, Total: res.Total, Page: page, Limit: limit}, nil
	}
}

func createContact(audienceID string, body createContactRequest) operation {
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		created, err := client.Audiences.Contacts.Create(ctx, audienceID, &coffeemail.CreateContactParams{
			Email:     body.Email,
			FirstName: body.FirstName,
			LastName:  body.LastName,
		})
		if err != nil {
			return nil, err
		}
		return toContactRecord(*created), nil
	}
}

func listSuppressions(r *http.Request) operation {
	page, limit := page(r), limit(r)
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		res, err := client.Suppressions.List(ctx, &coffeemail.ListSuppressionsParams{Limit: limit})
		if err != nil {
			return nil, err
		}
		items := mapItems(res.Suppressions, toSuppressionRecord)
		return paginatedResult[suppressionRecord]{Items: items, Total: len(items), Page: page, Limit: limit, HasMore: res.NextCursor != nil}, nil
	}
}

func createSuppression(body createSuppressionRequest) operation {
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		created, err := client.Suppressions.Create(ctx, &coffeemail.CreateSuppressionParams{
			Email:  body.Email,
			Reason: suppressionReasons[body.Reason],
		})
		if err != nil {
			return nil, err
		}
		return toSuppressionRecord(*created), nil
	}
}

func deleteSuppression(r *http.Request) operation {
	id := r.PathValue("email")
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		if err := client.Suppressions.Delete(ctx, id); err != nil {
			return nil, err
		}
		return true, nil
	}
}

func listWebhooks(_ *http.Request) operation {
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		res, err := client.Webhooks.List(ctx, nil)
		if err != nil {
			return nil, err
		}
		return mapItems(res.Webhooks, func(webhook coffeemail.Webhook) webhookRecord {
			return toWebhookRecord(webhook.ID, webhook.URL, webhook.Events, webhook.Status, webhook.CreatedAt)
		}), nil
	}
}

func createWebhook(body createWebhookRequest) operation {
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		created, err := client.Webhooks.Create(ctx, &coffeemail.CreateWebhookParams{
			URL:    body.URL,
			Events: mapItems(body.Events, func(event string) coffeemail.WebhookEvent { return coffeemail.WebhookEvent(event) }),
		})
		if err != nil {
			return nil, err
		}
		return toWebhookRecord(created.ID, created.URL, created.Events, coffeemail.WebhookStatusActive, created.CreatedAt), nil
	}
}

func testWebhook(r *http.Request) operation {
	id := r.PathValue("id")
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		return client.Webhooks.Test(ctx, id)
	}
}

func stats(r *http.Request) operation {
	query := r.URL.Query()
	params := &coffeemail.GetStatsParams{
		StartDate: query.Get("startDate"),
		EndDate:   query.Get("endDate"),
		Period:    statsPeriods[query.Get("period")],
	}
	return func(ctx context.Context, client *coffeemail.Client) (any, error) {
		res, err := client.Stats.Get(ctx, params)
		if err != nil {
			return nil, err
		}
		return statsRecord{
			TotalSent:      res.TotalSent,
			TotalDelivered: res.TotalDelivered,
			TotalBounced:   res.TotalBounced,
			DeliveryRate:   deliveryRate(res.TotalSent, res.TotalDelivered),
		}, nil
	}
}
