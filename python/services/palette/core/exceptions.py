class PaletteError(Exception):
    pass


class NoImagesDownloadedError(PaletteError):
    pass


class PaletteExtractionError(PaletteError):
    pass
