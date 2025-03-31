-- AlterTable
ALTER TABLE "LoginLog" ADD COLUMN     "continent_code" TEXT,
ADD COLUMN     "country_calling_code" TEXT,
ADD COLUMN     "country_capital" TEXT,
ADD COLUMN     "country_code" TEXT,
ADD COLUMN     "country_code_iso3" TEXT,
ADD COLUMN     "country_name" TEXT,
ADD COLUMN     "country_tld" TEXT,
ADD COLUMN     "currency_name" TEXT,
ADD COLUMN     "in_eu" BOOLEAN,
ADD COLUMN     "postal" TEXT,
ADD COLUMN     "region_code" TEXT,
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "utc_offset" TEXT;
