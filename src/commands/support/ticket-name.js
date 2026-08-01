const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { TicketModel } = require('../../database/models/Ticket');

module.exports = {
    category: 'tickets',
    data: new SlashCommandBuilder()
        .setName('ticket-name')
        .setDescription('Cập nhật tên và trạng thái của ticket')
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Trạng thái của đơn hàng')
                .setRequired(true)
                .addChoices(
                    { name: '🔃 Pending', value: 'pending' },
                    { name: 'Hoàn thành (Done)', value: 'done' },
                    { name: '❌ Hoàn (Huy)', value: 'huy' }
                ))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Tên mới của đơn hàng/ticket (K bắt buộc nếu Done/Huy)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, client) {
        const status = interaction.options.getString('status');
        let name = interaction.options.getString('name');

        const ticket = await TicketModel.findOne({ channelId: interaction.channelId });

        if (!ticket) {
            return interaction.reply({
                content: 'Lệnh này chỉ có thể sử dụng trong kênh ticket.',
                flags: [MessageFlags.Ephemeral]
            });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // Handle naming logic per status
        if (status === 'pending' && !name) {
            return interaction.editReply({
                content: 'Vui lòng nhập tên đơn hàng khi đặt trạng thái Pending.'
            });
        }

        if (status === 'done' && !name) name = 'DONE';
        if (status === 'huy' && !name) name = 'HOAN';

        name = name.toUpperCase();

        let statusEmoji = '';
        if (status === 'pending') statusEmoji = '🔃';
        else if (status === 'done') statusEmoji = '✅';
        else if (status === 'huy') statusEmoji = '❌';

        const newChannelName = `${statusEmoji}-${name}`;

        try {
            await interaction.channel.setName(newChannelName);

            const embed = new EmbedBuilder()
                .setColor(client.config.colors.success)
                .setTitle('✅ Cập nhật trạng thái Ticket')
                .setDescription(`Tên ticket đã được đổi thành: **${newChannelName}**\nTrạng thái: **${status.toUpperCase()}**`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({
                content: 'Có lỗi xảy ra khi đổi tên kênh. Vui lòng kiểm tra quyền hạn của Bot hoặc giới hạn đổi tên của Discord (2 lần/10 phút).'
            });
        }
    }
};
