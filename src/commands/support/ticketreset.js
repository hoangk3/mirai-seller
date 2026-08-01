const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { CounterModel } = require('../../database/models/Ticket');
const emoji = require('../../../emoji.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketreset')
        .setDescription('[ADMIN ONLY] Reset số thứ tự ticket về 0')
        .addIntegerOption((option) =>
            option.setName('value').setDescription('Số thứ tự mới (mặc định 0)').setMinValue(0)
        ),

    async execute(interaction, client) {
        if (!interaction.guild) return;

        const member = await interaction.guild.members.fetch(interaction.user.id);
        const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
        const isDev = client.config.developerIds?.includes(interaction.user.id);

        if (!isAdmin && !isDev) {
            return interaction.reply({
                content: `${emoji.error || '❌'} Bạn không có quyền reset số thứ tự ticket.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const newValue = interaction.options.getInteger('value') ?? 0;

        await CounterModel.findByIdAndUpdate({ _id: 'ticket' }, { seq: newValue }, { upsert: true });

        return interaction.reply({
            content: `${emoji.success || '✅'} Đã reset số thứ tự ticket về **${newValue}**. Ticket tiếp theo sẽ có ID là **${newValue + 1}**.`,
            flags: MessageFlags.Ephemeral
        });
    }
};
