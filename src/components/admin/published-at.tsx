'use client';

import { useConfig, useDocumentInfo, useTranslation } from '@payloadcms/ui';
import { formatDate } from '@payloadcms/ui/shared';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// When the product last went live, in the row with Payload's status and dates. No slot takes an item
// there and Payload does not export its status to wrap, so it is portalled in from the slot beside
// the buttons. The date is the latest published version's: no field to keep in step on every save,
// and a product published before this has it too.
const PublishedAt = () => {
  const { id, hasPublishedDoc, lastUpdateTime } = useDocumentInfo();
  const { config } = useConfig();
  const { i18n } = useTranslation();
  const [row, setRow] = useState<Element | null>(null);
  const [published, setPublished] = useState<string>();
  const api = `${config.serverURL}${config.routes.api}`;

  useEffect(() => {
    if (!id || !hasPublishedDoc) return;
    const controller = new AbortController();
    fetch(
      `${api}/products/versions?where[parent][equals]=${id}&where[version._status][equals]=published&sort=-updatedAt&limit=1&depth=0`,
      { credentials: 'include', signal: controller.signal },
    )
      .then((response) => response.json())
      .then(({ docs }) => setPublished(docs?.[0]?.updatedAt))
      // Left out of the row, as a date that cannot be read says nothing about the product.
      .catch(() => {});
    return () => controller.abort();
  }, [api, id, hasPublishedDoc, lastUpdateTime]);

  return (
    <>
      <span
        hidden
        ref={(anchor) =>
          setRow(
            anchor
              ?.closest('.doc-controls__wrapper')
              ?.querySelector('.doc-controls__meta') ?? null,
          )
        }
      />
      {row &&
        id &&
        createPortal(
          <li className="doc-controls__list-item doc-controls__value-wrap">
            {!hasPublishedDoc && (
              <p className="doc-controls__label">Не опубліковано</p>
            )}
            {hasPublishedDoc && published && (
              <>
                <p className="doc-controls__label">Опубліковано:&nbsp;</p>
                <p className="doc-controls__value">
                  {formatDate({
                    date: published,
                    i18n,
                    pattern: config.admin.dateFormat,
                  })}
                </p>
              </>
            )}
          </li>,
          row,
        )}
    </>
  );
};

export default PublishedAt;
