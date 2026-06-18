import { SetMetadata } from '@nestjs/common';

export const IS_LICENSE_EXEMPT = 'is-license-exempt';
export const LicenseExempt = () => SetMetadata(IS_LICENSE_EXEMPT, true);
