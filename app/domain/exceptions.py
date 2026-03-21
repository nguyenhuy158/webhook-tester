from __future__ import annotations


class EndpointNotFoundError(Exception):
    pass


class SlugAlreadyExistsError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass
