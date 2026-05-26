class PaletteError(Exception):
    pass


class NoImagesDownloadedError(PaletteError):
    pass


class PaletteExtractionError(PaletteError):
    pass


class CatalogError(Exception):
    pass


class CatalogConfigurationError(CatalogError):
    pass


class CatalogStorageError(CatalogError):
    pass


class CatalogAuthenticationError(CatalogError):
    pass
