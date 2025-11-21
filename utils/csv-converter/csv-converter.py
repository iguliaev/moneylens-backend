import argparse
import csv
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
import json
from typing import Optional, TextIO


@dataclass
class Category:
    type: str
    name: str
    description: Optional[str]


@dataclass
class BankAccount:
    name: str
    description: Optional[str]


@dataclass
class Tag:
    name: str
    description: Optional[str]


@dataclass
class Transaction:
    date: str
    type: str
    category: str
    bank_account: str
    amount: float
    tags: Optional[list[str]] = None
    notes: Optional[str] = None


@dataclass
class Payload:
    categories: Optional[list[Category]] = None
    bank_accounts: Optional[list[BankAccount]] = None
    tags: Optional[list[Tag]] = None
    transactions: Optional[list[Transaction]] = None


def parse_amount(amount_str: str) -> float:
    """
    Parse a string representation of a monetary amount and convert it to a float.
    This function handles various amount formats including:
    - Comma-separated thousands (e.g., "1,000.00")
    - Negative amounts in parentheses (e.g., "(100.00)" becomes -100.00)
    - Whitespace padding
    Args:
        amount_str (str): The string representation of the amount to parse.
    Returns:
        float: The parsed amount as a floating-point number.
    Raises:
        ValueError: If the amount string is empty or has an invalid format
                    that cannot be converted to a float.
    Examples:
        >>> parse_amount("1,234.56")
        1234.56
        >>> parse_amount("(100.00)")
        -100.0
        >>> parse_amount("  50.25  ")
        50.25
    """

    cleaned_str = amount_str.replace(",", "").strip()
    is_negative = cleaned_str.startswith(
        "("
    )  # Ensure negative amounts are handled correctly
    if is_negative:
        cleaned_str = cleaned_str.replace("(", "").replace(")", "")

    if not cleaned_str:
        raise ValueError("Amount string is empty")

    try:
        amount = float(cleaned_str)
        if is_negative:
            amount = -amount
    except ValueError as e:
        raise ValueError(f"Invalid amount format: {amount_str}") from e

    return amount


class PayloadBuilder:
    """
    A builder class for constructing Payload objects from CSV data.

    This class uses the builder pattern to incrementally construct a Payload by adding
    categories, bank accounts, tags, and transactions. It maintains internal sets to
    prevent duplicate entries for categories, bank accounts, and tags.

    Attributes:
        categories (list): List of Category objects to be included in the payload.
        category_types (set): Set of tuples (name, type) to track unique categories.
        bank_accounts (list): List of BankAccount objects to be included in the payload.
        bank_account_names (set): Set of bank account names to track unique accounts.
        tags (list): List of Tag objects to be included in the payload.
        tag_names (set): Set of tag names to track unique tags.
        transactions (list): List of Transaction objects to be included in the payload.
    """

    def __init__(self):
        """
        Initialize a new PayloadBuilder instance.

        Initializes empty collections for categories, bank accounts, tags, and transactions,
        along with tracking sets to ensure uniqueness.
        """

        self.categories = []
        self.category_types = set()
        self.bank_accounts = []
        self.bank_account_names = set()
        self.tags = []
        self.tag_names = set()
        self.transactions = []

    def add_category(self, category: Category) -> "PayloadBuilder":
        """
        Add a category to the payload.

        Only adds the category if a category with the same name and type doesn't already exist.

        Args:
            category (Category): The category object to add.

        Returns:
            PayloadBuilder: Returns self to allow method chaining.
        """

        if (category.name, category.type) not in self.category_types:
            self.category_types.add((category.name, category.type))
            self.categories.append(category)
        return self

    def add_bank_account(self, account: BankAccount) -> "PayloadBuilder":
        """
        Add a bank account to the payload.

        Only adds the bank account if an account with the same name doesn't already exist.

        Args:
            account (BankAccount): The bank account object to add.

        Returns:
            PayloadBuilder: Returns self to allow method chaining.
        """

        if account.name not in self.bank_account_names:
            self.bank_account_names.add(account.name)
            self.bank_accounts.append(account)
        return self

    def add_tag(self, tag: Tag) -> "PayloadBuilder":
        """
        Add a tag to the payload.

        Only adds the tag if a tag with the same name doesn't already exist.

        Args:
            tag (Tag): The tag object to add.

        Returns:
            PayloadBuilder: Returns self to allow method chaining.
        """

        if tag.name not in self.tag_names:
            self.tag_names.add(tag.name)
            self.tags.append(tag)
        return self

    def add_tags(self, tags: list[str]) -> "PayloadBuilder":
        """
        Add multiple tags to the payload.

        Only adds tags that do not already exist in the payload.

        Args:
            tags (list[Tag]): A list of tag objects to add.

        Returns:
            PayloadBuilder: Returns self to allow method chaining.
        """

        for tag_name in tags:
            if tag_name not in self.tag_names:
                self.tag_names.add(tag_name)
                self.tags.append(Tag(name=tag_name, description=None))

        return self

    def add_transaction(self, transaction: Transaction) -> "PayloadBuilder":
        """
        Add a transaction to the payload.

        Transactions are always added without duplication checking.

        Args:
            transaction (Transaction): The transaction object to add.

        Returns:
            PayloadBuilder: Returns self to allow method chaining.
        """

        self.transactions.append(transaction)
        return self

    def build(self) -> Payload:
        """
        Build and return the final Payload object.

        Constructs a Payload object from all the accumulated categories, bank accounts,
        tags, and transactions.

        Returns:
            Payload: A Payload object containing all added data.
        """

        return Payload(
            categories=self.categories,
            bank_accounts=self.bank_accounts,
            tags=self.tags,
            transactions=self.transactions,
        )


class BaseConverter(ABC):
    """
    Base class for CSV converters providing a shared payload builder
    and a common interface for converting files and retrieving payloads.
    """

    def __init__(self):
        self.payload_builder = PayloadBuilder()

    @abstractmethod
    def convert(self, csv_file: TextIO):
        """Parse the given CSV and populate self.payload_builder."""
        raise NotImplementedError

    def get_payload(self) -> Payload:
        return self.payload_builder.build()


class SavingsConverter(BaseConverter):
    """
    Converter for transforming savings account CSV files into JSON format.

    This class processes CSV files containing savings transaction data and converts
    them into a structured payload format suitable for the MoneyLens backend.

    Attributes:
        payload_builder (PayloadBuilder): Builder instance for constructing the output payload.
        transaction_type (str): Type of transaction, set to "save" for savings transactions.
        bank_account (BankAccount): Bank account instance representing the savings account.

    Example:
        >>> converter = SavingsConverter("My Savings")
        >>> with open('savings.csv', 'r') as f:
        ...     converter.convert(f)
        >>> payload = converter.get_payload()
    """

    def __init__(self, bank_account_name: str = "Savings Account"):
        super().__init__()
        self.transaction_type = "save"
        self.bank_account = BankAccount(bank_account_name, None)

    def convert(self, csv_file: TextIO):
        """
        Convert CSV file data into structured transactions.

        This method reads a CSV file containing transaction data, skips the first 4 header rows,
        and processes each subsequent row to extract transaction information. For each valid row,
        it creates Category and Transaction objects and adds them to the payload builder.

        Args:
            csv_file (TextIO): A file-like object containing CSV data with the following columns:
                - skip1: First column to skip
                - skip2: Second column to skip
                - date: Transaction date
                - amount: Transaction amount
                - category: Category name
                - notes: Transaction notes

        Returns:
            None: This method modifies the payload_builder in place and does not return a value.

        Note:
            - The CSV file is expected to have 4 header rows that are skipped during processing.
            - Only rows with non-empty category_name, date, and amount are processed.
            - The amount is parsed using the parse_amount utility function.
            - All string fields are stripped of leading/trailing whitespace.
        """

        fieldnames = ["skip1", "skip2", "date", "amount", "category", "notes"]
        reader = csv.DictReader(csv_file, fieldnames=fieldnames)

        skip_rows = 4  # Savings CSV has 4 header rows to skip
        for _ in range(skip_rows):
            try:
                next(reader)
            except StopIteration:
                # File shorter than expected header rows; nothing to convert.
                return

        for row in reader:
            category_name = row.get("category", "").strip()
            date = row.get("date", "").strip()
            amount = parse_amount(row.get("amount", "").strip())
            notes = row.get("notes", "").strip()
            notes = notes if notes else None

            if category_name and date:
                self.payload_builder.add_category(
                    Category(
                        type=self.transaction_type,
                        name=category_name,
                        description=None,
                    ),
                ).add_bank_account(
                    self.bank_account,
                ).add_transaction(
                    Transaction(
                        date=date,
                        amount=amount,
                        notes=notes,
                        category=category_name,
                        bank_account=self.bank_account.name,
                        tags=None,
                        type=self.transaction_type,
                    ),
                )

    # Inherit get_payload from BaseConverter


def parse_transaction_bank_account(code: str) -> BankAccount:
    """
    Parse a bank account code and return the corresponding BankAccount object.

    Args:
        code (str): A single character code representing a bank account.
                    Valid codes are:
                    - "" (empty string): NatWest
                    - "B": Barclays
                    - "W": Wise Virtual Card
                    - "X": AmEx
                    - "M": Monzo
                    - "A": Wise Virtual Card

    Returns:
        BankAccount: A BankAccount object with the corresponding bank name and None as description.

    Raises:
        ValueError: If the provided code is not found in the mapping.
    """

    mapping = {
        "": "NatWest",
        "B": "Barclays",
        "W": "Wise Virtual Card",
        "X": "AmEx",
        "M": "Monzo",
        "A": "Wise Virtual Card",
    }

    bank_account_name = mapping.get(code)
    if not bank_account_name:
        raise ValueError(f"Unknown bank account code: {code}")

    return BankAccount(name=bank_account_name, description=None)


def parse_transaction_tags(tags: str) -> Optional[list[str]]:
    """
    Parse transaction tags from a string input.

    Args:
        tags (str): A string containing transaction tags.

    Returns:
        Optional[list[str]]: A list containing the tag string if tags is non-empty after stripping whitespace,
                            otherwise None.

    Examples:
        >>> parse_transaction_tags("  groceries  ")
        ['groceries']
        >>> parse_transaction_tags("tag1, tag2")
        ['tag1', 'tag2']
        >>> parse_transaction_tags("   ")
        None
    """
    tags = [tag.strip() for tag in tags.split(",")]
    return tags if any(tags) else None


class TransactionConverter(BaseConverter):
    """
    A converter class for processing CSV files containing transaction data.

    This class extends BaseConverter to handle the conversion of CSV files with a specific
    format that includes both spending and earning transactions. The CSV file is expected
    to have a particular structure with earnings data in the first columns and spending
    data in the later columns.

    Expected CSV Structure:
        - Row 1: Contains the earning date in the 'earn_date' field
        - Rows 2-13: Spending transactions with date, category, amount, bank account, and tags
        - Rows 14+: Earning transactions with category and amount

    Attributes:
        Inherits all attributes from BaseConverter, including payload_builder for
        constructing the output payload.

    Methods:
        convert(csv_file: TextIO) -> None:
            Processes the CSV file and extracts both spending and earning transactions.
            Populates the payload builder with categories, bank accounts, and transactions.

    Example:
        >>> converter = TransactionConverter()
        >>> with open('transactions.csv', 'r') as f:
        ...     converter.convert(f)
    """

    def __init__(self):
        super().__init__()

    def convert(self, csv_file: TextIO):
        """
        Convert a CSV file into structured transaction data.

        This method reads a CSV file with a specific format containing both spending and earning
        transactions, and uses a payload builder to structure the data into categories, bank accounts,
        and transactions.

        Args:
            csv_file (TextIO): A text file object containing CSV data with the following columns:
                - earn_category: Category name for earning transactions
                - earn_amount: Amount for earning transactions
                - skip1: Unused column
                - earn_date: Date for earning transactions
                - skip2: Unused column
                - date: Date for spending transactions
                - category: Category name for spending transactions
                - amount: Amount for spending transactions
                - bank_account: Bank account for spending transactions
                - tags: Tags for spending transactions

        Returns:
            None: The method populates the payload_builder with categories, bank accounts,
            and transactions but does not return a value.

        Notes:
            - Row 1 contains the earning date
            - Rows 2-13 contain spending transactions
            - Rows 14+ contain earning transactions
            - All earning transactions use "Barclays" as the default bank account
            - Empty rows (missing date, category, or amount) are skipped
        """

        fieldnames = [
            "earn_category",
            "earn_amount",
            "skip1",
            "earn_date",
            "skip2",
            "date",
            "category",
            "amount",
            "bank_account",
            "tags",
        ]

        reader = csv.DictReader(csv_file, fieldnames=fieldnames)

        earn_date_row = 1
        spend_transactions_start_row = 2
        earn_transactions_start_row = 14  # Earnings records start
        earn_bank_account = "Barclays"

        earn_date = None
        for idx, row in enumerate(reader):
            if idx == earn_date_row:
                earn_date = row.get("earn_date", "").strip()
            if idx >= spend_transactions_start_row:
                spend_date = row.get("date", "").strip()
                spend_category = row.get("category", "").strip()
                spend_amount = row.get("amount", "").strip()
                spend_tags = parse_transaction_tags(row.get("tags", "").strip())
                if spend_date and spend_category and spend_amount:
                    spend_bank_account = parse_transaction_bank_account(
                        row.get("bank_account", "").strip()
                    )
                    self.payload_builder.add_category(
                        Category(
                            type="spend",
                            name=spend_category,
                            description=None,
                        ),
                    ).add_bank_account(
                        spend_bank_account,
                    ).add_tags(
                        spend_tags if spend_tags else []
                    ).add_transaction(
                        Transaction(
                            date=spend_date,
                            type="spend",
                            category=spend_category,
                            bank_account=spend_bank_account.name,
                            amount=parse_amount(spend_amount),
                            tags=spend_tags,
                            notes=None,
                        ),
                    )

            if idx >= earn_transactions_start_row:
                earn_category = row.get("earn_category", "").strip()
                earn_amount = row.get("earn_amount", "").strip()

                if earn_category and earn_amount:
                    self.payload_builder.add_category(
                        Category(
                            type="earn",
                            name=earn_category,
                            description=None,
                        ),
                    ).add_bank_account(
                        BankAccount(
                            name=earn_bank_account,
                            description=None,
                        ),
                    ).add_transaction(
                        Transaction(
                            date=earn_date,
                            type="earn",
                            category=earn_category,
                            bank_account=earn_bank_account,
                            amount=parse_amount(earn_amount),
                            tags=None,
                            notes=None,
                        ),
                    )


def exclude_if_none_factory(value):
    """
    Factory function that creates a dictionary from an iterable of key-value pairs, excluding entries where the value is None.

    Args:
        value: An iterable of tuples containing (key, value) pairs.

    Returns:
        dict: A dictionary containing only the key-value pairs where the value is not None.

    Example:
        >>> exclude_if_none_factory([('a', 1), ('b', None), ('c', 3)])
        {'a': 1, 'c': 3}
    """
    return {k: v for (k, v) in value if v is not None}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert CSV to JSON")
    parser.add_argument(
        "-i",
        "--input",
        required=True,
        nargs="+",
        help="Path(s) to input CSV file(s)",
    )
    parser.add_argument("-o", "--output", help="Path to the output JSON file")
    parser.add_argument(
        "-t",
        "--type",
        required=True,
        choices=["savings", "transactions"],
        help="Type of CSV to convert",
    )
    args = parser.parse_args()

    if args.type == "transactions":
        converter = TransactionConverter()
    else:
        converter = SavingsConverter()

    try:
        for input_path in args.input:
            with open(input_path, mode="r", encoding="utf-8") as csv_file:
                converter.convert(csv_file)

        payload = converter.get_payload()
        json_string = json.dumps(
            asdict(payload, dict_factory=exclude_if_none_factory),
            indent=2,
        )
        if args.output:
            with open(args.output, mode="w", encoding="utf-8") as json_file:
                json_file.write(json_string)
        else:
            print(json_string)
    except FileNotFoundError as e:
        print(f"Error: File not found: {e}")
    except ValueError as e:
        print(f"Error: Invalid data format in CSV: {e}")
    except Exception as e:
        print(f"Error: An unexpected error occurred: {e}")
