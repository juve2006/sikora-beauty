'use client';

import { useModal, useSelection } from '@payloadcms/ui';
import { useEffect } from 'react';

// Payload's dialog of a bulk publish says only «всі Товари у вибірці», and neither its text nor its
// props take a count. So the line is added to its content from here, inside the list's selection.
const PublishCount = () => {
  const { count } = useSelection();
  const { isModalOpen } = useModal();
  const open = isModalOpen('publish-products');

  useEffect(() => {
    if (!open) return;
    const line = document.createElement('strong');
    line.textContent = `Вибрано: ${count}`;
    document
      .querySelector('#publish-products .confirmation-modal__content')
      ?.append(line);
    return () => line.remove();
  }, [open, count]);

  return null;
};

export default PublishCount;
