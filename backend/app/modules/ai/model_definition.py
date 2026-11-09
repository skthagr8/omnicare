# modules/ai/model_definition.py
import torch
import torch.nn as nn


class CognitiveLSTM(nn.Module):
    def __init__(self, input_dim, hidden_dim=64, num_layers=2, dropout=0.30):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            dropout=(dropout if num_layers > 1 else 0),
            batch_first=True,
            bidirectional=True,
        )
        self.head = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, 1),
        )

    def forward(self, x: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        output, _ = self.lstm(x)
        seq_len = x.shape[1]
        last_indices = seq_len - 1 - mask.flip(1).argmax(dim=1)
        batch_indices = torch.arange(x.size(0), device=x.device)
        last_output = output[batch_indices, last_indices]
        return self.head(last_output).squeeze(1)